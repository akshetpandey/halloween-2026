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

local function eq_band(track, fx, band)
  local kind, band_index = band.band_type, band.band_index
  local gain_index
  for p = 0, reaper.TrackFX_GetNumParams(track, fx)-1 do
    local ok, t, b, parameter = reaper.TrackFX_GetEQParam(track, fx, p)
    if ok and t == kind and b == band_index and parameter == 1 then gain_index = p end
  end
  assert(gain_index, 'Cannot find EQ band gain parameter')
  assert(reaper.TrackFX_SetEQParam(track, fx, kind, band_index, 0, band.frequency_hz, false))
  if band.q then assert(reaper.TrackFX_SetEQParam(track, fx, kind, band_index, 2, band.q, false)) end
  assert(reaper.TrackFX_SetEQBandEnabled(track, fx, kind, band_index, true))
  -- Calibrate against the actual plugin's dB readout, not a guessed gain scale.
  local function parameter_value(db)
    local function boundary(strict)
      local lo, hi = 0, 1
      for _ = 1, 28 do
        local middle = (lo + hi) / 2
        local ok, label = reaper.TrackFX_FormatParamValue(track, fx, gain_index, middle)
        local actual = ok and tonumber(label:match('[-+]?%d+%.?%d*'))
        assert(actual, 'Cannot read EQ gain in dB')
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
  for _, point in ipairs(band.points) do
    -- FX envelopes use raw parameter units, not TrackFX_SetParamNormalized units.
    local raw = parameter_value(point.db)
    local ok, formatted = reaper.TrackFX_FormatParamValue(track, fx, gain_index, raw)
    assert(reaper.InsertEnvelopePoint(envelope, point.time,
      reaper.ScaleToEnvelopeMode(mode, raw), 0, 0, false, true))
  end
  reaper.Envelope_SortPoints(envelope)
  for i = 0, reaper.CountEnvelopePoints(envelope)-1 do
    local ok, time, value = reaper.GetEnvelopePoint(envelope, i)
    assert(ok, 'Could not read EQ envelope point')
    local raw = reaper.ScaleFromEnvelopeMode(mode, value)
    local _, formatted = reaper.TrackFX_FormatParamValue(track, fx, gain_index, raw)
    values[#values+1] = {time=time, db=band.points[i+1].db,
                        parameter_value=raw, plugin_readout=formatted}
  end
  local parameters = {}
  for p = 0, reaper.TrackFX_GetNumParams(track, fx)-1 do
    local ok, t, b, parameter = reaper.TrackFX_GetEQParam(track, fx, p)
    if ok and t == kind and b == band_index then
      parameters[tostring(parameter)] = select(2, reaper.TrackFX_GetFormattedParamValue(track, fx, p, ''))
    end
  end
  reaper.SetMediaTrackInfo_Value(track, 'I_AUTOMODE', 1)
  local _, state = reaper.GetEnvelopeStateChunk(envelope, '', false)
  return {effect='ReaEQ (Cockos)', name=band.name, band_type=kind,
    enabled=reaper.TrackFX_GetEQBandEnabled(track, fx, kind, band_index),
    automation_active=state:find('ACT 1', 1, true) ~= nil,
    shelf_hz=band.frequency_hz, gain_parameter=gain_index, parameters=parameters, points=values}
end

local function volume_envelope(track, points, gain)
  local envelope = reaper.GetTrackEnvelopeByChunkName(track, '<VOLENV2')
  if not envelope then
    local command = reaper.kbd_getTextFromCmd(40406, 0)
    assert(command:lower():find('volume envelope'), 'Unexpected volume-envelope action')
    reaper.SetOnlyTrackSelected(track)
    reaper.Main_OnCommand(40406, 0)
    envelope = reaper.GetTrackEnvelopeByChunkName(track, '<VOLENV2')
  end
  assert(envelope, 'Could not create native volume envelope')
  -- A built-in envelope handle can exist while its lane is inactive. Enable it
  -- with the native action before editing; a chunk edit alone is ignored here.
  local ok, state = reaper.GetEnvelopeStateChunk(envelope, '', false)
  assert(ok, 'Cannot read volume envelope activation')
  if not state:find('ACT 1', 1, true) then
    local command = reaper.kbd_getTextFromCmd(40406, 0)
    assert(command:lower():find('volume envelope'), 'Unexpected volume-envelope action')
    reaper.SetOnlyTrackSelected(track)
    reaper.Main_OnCommand(40406, 0)
    envelope = assert(reaper.GetTrackEnvelopeByChunkName(track, '<VOLENV2'))
    local _, activated = reaper.GetEnvelopeStateChunk(envelope, '', false)
    assert(activated:find('ACT 1', 1, true), 'Native action did not activate volume envelope')
  end
  local mode = reaper.GetEnvelopeScalingMode(envelope)
  reaper.DeleteEnvelopePointRange(envelope, -1e10, 1e10)
  for _, point in ipairs(points) do
    assert(point.amplitude >= 0 and point.amplitude <= 1, 'Volume must only attenuate')
    assert(reaper.InsertEnvelopePoint(envelope, point.time,
      reaper.ScaleToEnvelopeMode(mode, point.amplitude * 10^(gain/20)), 0, 0, false, true))
  end
  reaper.Envelope_SortPoints(envelope)
  reaper.SetMediaTrackInfo_Value(track, 'I_AUTOMODE', 1)
  local values = {}
  for i = 0, reaper.CountEnvelopePoints(envelope)-1 do
    local ok, time, value = reaper.GetEnvelopePoint(envelope, i)
    assert(ok, 'Could not read volume envelope')
    values[#values+1] = {time=time, amplitude=reaper.ScaleFromEnvelopeMode(mode, value)}
  end
  local _, state = reaper.GetEnvelopeStateChunk(envelope, '', false)
  return {points=values, automation_mode=reaper.GetTrackAutomationMode(track),
          active=state:find('ACT 1', 1, true) ~= nil}
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
  reaper.GetSetRepeatEx(0, 0)
  reaper.SetGlobalAutomationOverride(-1)
  local pitch, pitch_name = pitch_mode()
  local report = {version=reaper.GetAppVersion(), pitch_algorithm=pitch_name,
    project=plan.project, end_seconds=plan.end_seconds, tracks={}, markers=plan.markers,
    manifest_sha256=plan.manifest_sha256, run_id=plan.run_id,
    global_automation_override=reaper.GetGlobalAutomationOverride(),
    repeat_mode=reaper.GetSetRepeatEx(0, -1)}
  reaper.SetTempoTimeSigMarker(0, -1, 0, -1, -1, plan.bpm, 4, 4, false)
  for _, point in ipairs(plan.tempo_map or {}) do
    if point.time > 0.000001 then
      assert(reaper.SetTempoTimeSigMarker(0, -1, point.time, -1, -1,
        point.bpm, 4, 4, false))
    end
  end
  reaper.SetMediaTrackInfo_Value(reaper.GetMasterTrack(0), 'D_VOL', 10^(plan.master_db/20))
  for index, definition in ipairs(plan.tracks) do
    reaper.InsertTrackAtIndex(index-1, true)
    local track = reaper.GetTrack(0, index-1)
    reaper.GetSetMediaTrackInfo_String(track, 'P_NAME', definition.name, true)
    reaper.SetMediaTrackInfo_Value(track, 'I_RECARM', 0)
    reaper.SetMediaTrackInfo_Value(track, 'I_RECMON', 0)
    local gain = definition.gain_db or 0
    assert(gain == gain and gain >= -60 and gain <= 12, 'Invalid track gain')
    assert(reaper.SetMediaTrackInfo_Value(track, 'D_VOL', 10^(gain/20)))
    local actual = {name=definition.name, source_sha256=definition.sha256,
      gain_db=20*math.log(reaper.GetMediaTrackInfo_Value(track, 'D_VOL'), 10), clips={}}
    if definition.eq_bands or definition.shelf then
      local fx = reaper.TrackFX_AddByName(track, 'ReaEQ (Cockos)', false, -1)
      assert(fx >= 0, 'Bundled ReaEQ unavailable')
      if definition.eq_bands then
        -- Disable unused default bands; explicitly enable the three defined bands.
        for p = 0, reaper.TrackFX_GetNumParams(track, fx)-1 do
          local ok, kind, band, parameter = reaper.TrackFX_GetEQParam(track, fx, p)
          if ok and kind >= 0 and parameter == 0 then
            assert(reaper.TrackFX_SetEQBandEnabled(track, fx, kind, band, false))
          end
        end
        actual.eq_bands = {}
        for _, band in ipairs(definition.eq_bands) do
          actual.eq_bands[#actual.eq_bands+1] = eq_band(track, fx, band)
        end
      else
        actual.eq = eq_band(track, fx, {name='low', band_type=1, band_index=0,
          frequency_hz=180, points=definition.shelf})
      end
    end
    if definition.volume then actual.volume = volume_envelope(track, definition.volume, gain) end
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
      local stretch = {}
      if clip.stretch_markers then
        assert(clip.rate == 1, 'Warped clips must use unit playback rate')
        for _, point in ipairs(clip.stretch_markers) do
          local marker = reaper.SetTakeStretchMarker(take, -1, point.position, point.source)
          assert(marker >= 0, 'Could not insert stretch marker')
          local ok, position, source_position = reaper.GetTakeStretchMarker(take, marker)
          assert(ok >= 0, 'Could not read stretch marker')
          stretch[#stretch+1] = {position=position, source=source_position}
        end
      end
      actual.clips[#actual.clips+1] = {
        path=reaper.GetMediaSourceFileName(reaper.GetMediaItemTake_Source(take), ''),
        source_start=reaper.GetMediaItemTakeInfo_Value(take, 'D_STARTOFFS'),
        rate=reaper.GetMediaItemTakeInfo_Value(take, 'D_PLAYRATE'),
        preserve_pitch=reaper.GetMediaItemTakeInfo_Value(take, 'B_PPITCH'),
        position=reaper.GetMediaItemInfo_Value(item, 'D_POSITION'),
        length=reaper.GetMediaItemInfo_Value(item, 'D_LENGTH'),
        fade_in=reaper.GetMediaItemInfo_Value(item, 'D_FADEINLEN'),
        fade_out=reaper.GetMediaItemInfo_Value(item, 'D_FADEOUTLEN'),
        stretch_markers=stretch}
    end
    report.tracks[#report.tracks+1] = actual
  end
  for _, marker in ipairs(plan.markers) do
    reaper.AddProjectMarker2(0, false, marker.time, 0, marker.name, -1, 0)
  end
  local settings = {RENDER_SETTINGS=0, RENDER_BOUNDSFLAG=0,
    RENDER_STARTPOS=plan.render_start_seconds or 0,
    RENDER_ENDPOS=plan.render_end_seconds or plan.end_seconds, RENDER_SRATE=48000, RENDER_CHANNELS=2,
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
