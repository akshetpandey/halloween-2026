-- Native REAPER API builder. Called by a generated script, never during playback.
local M = {}

local function json(value)
  if type(value) == 'string' then
    return '"' .. value:gsub('[%z\1-\31\\"]', function(c)
      return string.format('\\u%04x', string.byte(c))
    end) .. '"'
  elseif type(value) == 'number' or type(value) == 'boolean' then
    return tostring(value)
  elseif type(value) == 'table' then
    local out = {}
    if #value > 0 then
      for _, v in ipairs(value) do out[#out+1] = json(v) end
      return '[' .. table.concat(out, ',') .. ']'
    end
    for k, v in pairs(value) do out[#out+1] = json(k) .. ':' .. json(v) end
    return '{' .. table.concat(out, ',') .. '}'
  end
  error('Unsupported report type')
end

local function write(path, text)
  local f = assert(io.open(path, 'w'))
  f:write(text .. '\n')
  f:close()
end

local function pitch_mode()
  local selected, name
  for i = 0, 100 do
    local ok, label = reaper.EnumPitchShiftModes(i)
    if not ok then break end
    if label and label:lower():find('lastique') and label:lower():find('pro') then
      selected, name = i * 65536, label
    end
  end
  assert(selected, 'No supported elastique Pro mode found')
  return selected, name
end

local function low_shelf(track, points)
  local fx = reaper.TrackFX_AddByName(track, 'ReaEQ (Cockos)', false, -1)
  assert(fx >= 0, 'Bundled ReaEQ unavailable')
  local gain_index
  for p = 0, reaper.TrackFX_GetNumParams(track, fx)-1 do
    local ok, kind, band, parameter = reaper.TrackFX_GetEQParam(track, fx, p)
    if ok and kind == 1 and band == 0 and parameter == 1 then gain_index = p end
  end
  assert(gain_index, 'Cannot find low-shelf gain parameter')
  assert(reaper.TrackFX_SetEQParam(track, fx, 1, 0, 0, 180, false))
  assert(reaper.TrackFX_SetEQBandEnabled(track, fx, 1, 0, true))
  -- Calibrate against the actual plugin's dB readout, not a guessed gain scale.
  local function parameter_value(db)
    local function boundary(strict)
      local lo, hi = 0, 1
      for _ = 1, 28 do
        local middle = (lo + hi) / 2
        local ok, label = reaper.TrackFX_FormatParamValue(track, fx, gain_index, middle)
        local actual = ok and tonumber(label:match('[-+]?%d+%.?%d*'))
        assert(actual, 'Cannot read low-shelf gain in dB')
        if actual < db or (strict and actual == db) then lo = middle else hi = middle end
      end
      return (lo + hi) / 2
    end
    -- Center the display's rounding interval in dB, avoiding its +/-0.1 dB edge.
    return math.sqrt(boundary(false) * boundary(true))
  end
  local envelope = assert(reaper.GetFXEnvelope(track, fx, gain_index, true))
  local mode = reaper.GetEnvelopeScalingMode(envelope)
  reaper.DeleteEnvelopePointRange(envelope, -1e10, 1e10)
  local values = {}
  for _, point in ipairs(points) do
    -- FX envelopes use raw parameter units, not TrackFX_SetParamNormalized units.
    local raw = parameter_value(point.db)
    local ok, formatted = reaper.TrackFX_FormatParamValue(track, fx, gain_index, raw)
    values[#values+1] = {time=point.time, db=point.db, parameter_value=raw,
                        plugin_readout=formatted}
    assert(reaper.InsertEnvelopePoint(envelope, point.time,
      reaper.ScaleToEnvelopeMode(mode, raw), 0, 0, false, true))
  end
  reaper.Envelope_SortPoints(envelope)
  reaper.SetMediaTrackInfo_Value(track, 'I_AUTOMODE', 1)
  return {effect='ReaEQ (Cockos)', shelf_hz=180, gain_parameter=gain_index, points=values}
end

function M.build(plan)
  local function not_cancelled()
    local cancelled = io.open(plan.cancel_file, 'r')
    if cancelled then cancelled:close(); error('This build was cancelled') end
  end
  not_cancelled()
  assert(reaper.GetPlayState() == 0, 'Stop playback before building a project')
  local command = reaper.kbd_getTextFromCmd(40859, 0)
  assert(command:lower():find('new project tab'), 'Unexpected new-tab action identity')
  -- Preserve any existing projects: construct this build in a fresh tab.
  reaper.Main_OnCommand(40859, 0)
  assert(reaper.CountTracks(0) == 0, 'Refusing to modify a nonempty project')
  local pitch, pitch_name = pitch_mode()
  local report = {version=reaper.GetAppVersion(), pitch_algorithm=pitch_name,
    project=plan.project, end_seconds=plan.end_seconds, tracks={}, markers=plan.markers,
    manifest_sha256=plan.manifest_sha256, run_id=plan.run_id}
  reaper.SetTempoTimeSigMarker(0, -1, 0, -1, -1, plan.bpm, 4, 4, false)
  reaper.SetMediaTrackInfo_Value(reaper.GetMasterTrack(0), 'D_VOL', 10^(plan.master_db/20))
  for index, definition in ipairs(plan.tracks) do
    reaper.InsertTrackAtIndex(index-1, true)
    local track = reaper.GetTrack(0, index-1)
    reaper.GetSetMediaTrackInfo_String(track, 'P_NAME', definition.name, true)
    reaper.SetMediaTrackInfo_Value(track, 'I_RECARM', 0)
    reaper.SetMediaTrackInfo_Value(track, 'I_RECMON', 0)
    local actual = {name=definition.name, source_sha256=definition.sha256, clips={}}
    if definition.shelf then actual.eq = low_shelf(track, definition.shelf) end
    for _, clip in ipairs(definition.clips) do
      local source = assert(reaper.PCM_Source_CreateFromFile(definition.path))
      local item = assert(reaper.AddMediaItemToTrack(track))
      local take = assert(reaper.AddTakeToMediaItem(item))
      assert(reaper.SetMediaItemTake_Source(take, source))
      reaper.GetSetMediaItemTakeInfo_String(take, 'P_NAME', definition.name, true)
      assert(reaper.SetMediaItemTakeInfo_Value(take, 'D_STARTOFFS', clip.source_start))
      assert(reaper.SetMediaItemTakeInfo_Value(take, 'D_PLAYRATE', clip.rate))
      assert(reaper.SetMediaItemTakeInfo_Value(take, 'B_PPITCH', 1))
      assert(reaper.SetMediaItemTakeInfo_Value(take, 'I_PITCHMODE', pitch))
      local settings = {D_POSITION=clip.position, D_LENGTH=clip.length,
        D_FADEINLEN=clip.fade_in, D_FADEOUTLEN=clip.fade_out,
        D_FADEINLEN_AUTO=0, D_FADEOUTLEN_AUTO=0,
        C_FADEINSHAPE=0, C_FADEOUTSHAPE=0, B_LOOPSRC=0, C_BEATATTACHMODE=0}
      for field, value in pairs(settings) do
        assert(reaper.SetMediaItemInfo_Value(item, field, value), field)
      end
      actual.clips[#actual.clips+1] = {
        path=reaper.GetMediaSourceFileName(reaper.GetMediaItemTake_Source(take), ''),
        source_start=reaper.GetMediaItemTakeInfo_Value(take, 'D_STARTOFFS'),
        rate=reaper.GetMediaItemTakeInfo_Value(take, 'D_PLAYRATE'),
        preserve_pitch=reaper.GetMediaItemTakeInfo_Value(take, 'B_PPITCH'),
        position=reaper.GetMediaItemInfo_Value(item, 'D_POSITION'),
        length=reaper.GetMediaItemInfo_Value(item, 'D_LENGTH'),
        fade_in=reaper.GetMediaItemInfo_Value(item, 'D_FADEINLEN'),
        fade_out=reaper.GetMediaItemInfo_Value(item, 'D_FADEOUTLEN')}
    end
    report.tracks[#report.tracks+1] = actual
  end
  for _, marker in ipairs(plan.markers) do
    reaper.AddProjectMarker2(0, false, marker.time, 0, marker.name, -1, 0)
  end
  local settings = {RENDER_SETTINGS=0, RENDER_BOUNDSFLAG=0, RENDER_STARTPOS=0,
    RENDER_ENDPOS=plan.end_seconds, RENDER_SRATE=48000, RENDER_CHANNELS=2,
    RENDER_TAILFLAG=0, RENDER_TAILMS=0, RENDER_ADDTOPROJ=0,
    RENDER_NORMALIZE=0, RENDER_DITHER=0, PROJECT_SRATE=48000, PROJECT_SRATE_USE=1}
  for field, value in pairs(settings) do reaper.GetSetProjectInfo(0, field, value, true) end
  reaper.GetSetProjectInfo_String(0, 'RENDER_FILE', plan.render_directory, true)
  reaper.GetSetProjectInfo_String(0, 'RENDER_PATTERN', plan.render_name, true)
  -- PCM24 WAV sink observed in the installed 7.82 build; verify output with ffprobe.
  reaper.GetSetProjectInfo_String(0, 'RENDER_FORMAT', 'ZXZhdxgAAQ==', true)
  reaper.GetSetProjectInfo_String(0, 'RENDER_FORMAT2', '', true)
  reaper.SetProjExtState(0, 'HalloweenPremix', 'manifest_sha256', plan.manifest_sha256)
  reaper.UpdateArrange()
  not_cancelled()
  reaper.Main_SaveProjectEx(0, plan.project, 8)
  local saved = assert(io.open(plan.project, 'r'), 'Project save did not create a file')
  local contents = saved:read('*a')
  saved:close()
  assert(contents:find(plan.manifest_sha256, 1, true), 'Saved project has a stale manifest')
  report.render_format = select(2, reaper.GetSetProjectInfo_String(0, 'RENDER_FORMAT', '', false))
  write(plan.readback, json(report))
end

function M.run(plan)
  local ok, err = xpcall(function() M.build(plan) end, debug.traceback)
  if not ok then
    write(plan.error_file, err)
    error(err)
  end
end
return M
