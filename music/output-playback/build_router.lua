-- Playback-only builder. Called in its own offline REAPER profile by prepare.py.
local C = OUTPUT_CONFIG
local function write(path, text)
  local f = assert(io.open(path, 'w')); f:write(text); f:close()
end
local function json(v)
  if type(v) == 'string' then
    return '"' .. v:gsub('[%z\1-\31\\"]', function(c)
      return string.format('\\u%04x', string.byte(c))
    end) .. '"'
  elseif type(v) == 'number' or type(v) == 'boolean' then return tostring(v)
  elseif type(v) == 'table' then
    local out = {}
    if #v > 0 then
      for _, x in ipairs(v) do out[#out+1] = json(x) end
      return '[' .. table.concat(out, ',') .. ']'
    end
    for k, x in pairs(v) do out[#out+1] = json(k) .. ':' .. json(x) end
    return '{' .. table.concat(out, ',') .. '}'
  end
  error('Unsupported report value')
end
local function build()
  if io.open(C.cancel, 'r') then return end
  assert(reaper.get_ini_file() == C.profile, 'Wrong REAPER profile; no project modified')
  assert(loadfile(C.arm_script), 'Output-mapping script failed Lua syntax check')
  assert(reaper.GetPlayState() == 0, 'Playback must be stopped')
  assert(reaper.kbd_getTextFromCmd(40859, 0):lower():find('new project tab'))
  reaper.Main_OnCommand(40859, 0)
  assert(reaper.CountTracks(0) == 0, 'Refusing to overwrite a nonempty project')
  reaper.GetSetRepeatEx(0, 0)
  reaper.SetGlobalAutomationOverride(-1)
  reaper.CSurf_OnPlayRateChange(1)
  local master = reaper.GetMasterTrack(0)
  reaper.SetMediaTrackInfo_Value(master, 'I_NCHAN', 4)
  reaper.SetMediaTrackInfo_Value(master, 'D_VOL', 10^(-12/20))
  reaper.SetMediaTrackInfo_Value(master, 'B_MUTE', C.proof and 0 or 1)
  -- Disconnected by design. arm_outputs.lua adds the two verified outputs tomorrow.
  for i = reaper.GetTrackNumSends(master, 1)-1, 0, -1 do
    reaper.RemoveTrackSend(master, 1, i)
  end
  local report = {run_id=C.run_id, project=C.project, source=C.source,
    hardware_outputs=0, tracks={}, master_db=-12,
    master_muted=not C.proof, repeat_mode=reaper.GetSetRepeatEx(0, -1)}
  local tracks = {}
  for i, name in ipairs({'FINISHED MUSIC - original speed',
      'AUDIOENGINE - stereo EQ / delay', 'HISENSE - stereo EQ / delay'}) do
    reaper.InsertTrackAtIndex(i-1, true)
    local t = reaper.GetTrack(0, i-1); tracks[i] = t
    reaper.GetSetMediaTrackInfo_String(t, 'P_NAME', name, true)
    reaper.SetMediaTrackInfo_Value(t, 'I_RECARM', 0)
    reaper.SetMediaTrackInfo_Value(t, 'I_RECMON', 0)
    reaper.SetMediaTrackInfo_Value(t, 'D_PANLAW', 1)
    reaper.SetMediaTrackInfo_Value(t, 'I_AUTOMODE', 0)
    reaper.SetMediaTrackInfo_Value(t, 'B_MAINSEND', i == 1 and 0 or 1)
    reaper.SetMediaTrackInfo_Value(t, 'C_MAINSEND_OFFS', i == 3 and 2 or 0)
    if i > 1 then
      local eq = reaper.TrackFX_AddByName(t, 'ReaEQ (Cockos)', false, -1)
      assert(eq >= 0, 'Bundled ReaEQ not found')
      local delay = reaper.TrackFX_AddByName(t, 'JS: time_adjustment', false, -1)
      assert(delay >= 0, 'Bundled Time Adjustment Delay not found')
      local delay_ms = C.proof and i == 2 and 120 or 0
      assert(reaper.TrackFX_SetParam(t, delay, 0, delay_ms))
      assert(reaper.TrackFX_SetParam(t, delay, 1, 0)) -- wet 0 dB
      assert(reaper.TrackFX_SetParam(t, delay, 2, -120)) -- dry minimum
      assert(reaper.TrackFX_SetParam(t, delay, 3, 0)) -- no extra samples
      if C.proof and i == 2 then reaper.SetMediaTrackInfo_Value(t, 'D_VOL', 10^(-3/20)) end
      report.tracks[#report.tracks+1] = {name=name,
        master_channel_offset=reaper.GetMediaTrackInfo_Value(t, 'C_MAINSEND_OFFS'),
        delay_ms=reaper.TrackFX_GetParam(t, delay, 0),
        delay_readout=select(2, reaper.TrackFX_GetFormattedParamValue(t, delay, 0)),
        wet_db=reaper.TrackFX_GetParam(t, delay, 1),
        dry_db=reaper.TrackFX_GetParam(t, delay, 2),
        eq_name=select(2, reaper.TrackFX_GetFXName(t, eq)),
        gain=reaper.GetMediaTrackInfo_Value(t, 'D_VOL')}
    end
  end
  for i = 2, 3 do
    local send = reaper.CreateTrackSend(tracks[1], tracks[i])
    assert(send >= 0)
    reaper.SetTrackSendInfo_Value(tracks[1], 0, send, 'I_SENDMODE', 0)
    reaper.SetTrackSendInfo_Value(tracks[1], 0, send, 'I_SRCCHAN', 0)
    reaper.SetTrackSendInfo_Value(tracks[1], 0, send, 'I_DSTCHAN', 0)
    reaper.SetTrackSendInfo_Value(tracks[1], 0, send, 'I_MIDIFLAGS', 31)
  end
  local source = assert(reaper.PCM_Source_CreateFromFile(C.source), 'Source unavailable')
  local length = reaper.GetMediaSourceLength(source)
  assert(length > 0)
  local item = reaper.AddMediaItemToTrack(tracks[1])
  local take = reaper.AddTakeToMediaItem(item)
  reaper.SetMediaItemTake_Source(take, source)
  reaper.SetMediaItemTakeInfo_Value(take, 'D_PLAYRATE', 1)
  reaper.SetMediaItemTakeInfo_Value(take, 'D_STARTOFFS', 0)
  reaper.SetMediaItemInfo_Value(item, 'D_LENGTH', length)
  reaper.SetMediaItemInfo_Value(item, 'D_FADEINLEN', 0)
  reaper.SetMediaItemInfo_Value(item, 'D_FADEOUTLEN', 0)
  reaper.SetMediaItemInfo_Value(item, 'B_LOOPSRC', 0)
  reaper.SetMediaItemInfo_Value(item, 'C_BEATATTACHMODE', 0)
  report.source_seconds = length
  report.source_rate = reaper.GetMediaItemTakeInfo_Value(take, 'D_PLAYRATE')
  reaper.AddProjectMarker2(0, false, 0, 0, 'CHECK OUTPUTS, then unmute MASTER and Play', -1, 0)
  reaper.AddProjectMarker2(0, false, length, 0, 'PARTY FILE ENDS - repeat is OFF', -1, 0)
  reaper.SetProjExtState(0, 'HalloweenOutput', 'version', 'stereo-1')
  reaper.SetProjExtState(0, 'HalloweenOutput', 'run_id', C.run_id)
  reaper.GetSetProjectNotes(0, true, 'Playback only. MASTER volume/mute controls both systems. '
    .. 'Separate stereo EQ/delay on the two buses. Outputs disconnected until mapped. '
    .. 'Do not change playback rate or repeat. Space = play/stop; Enter = pause.')
  for key, value in pairs({PROJECT_SRATE=48000, PROJECT_SRATE_USE=1,
      RENDER_SETTINGS=0, RENDER_BOUNDSFLAG=0, RENDER_STARTPOS=0,
      RENDER_ENDPOS=length, RENDER_SRATE=48000, RENDER_CHANNELS=4,
      RENDER_TAILFLAG=0, RENDER_TAILMS=0, RENDER_ADDTOPROJ=0,
      RENDER_NORMALIZE=0, RENDER_DITHER=0}) do
    reaper.GetSetProjectInfo(0, key, value, true)
  end
  reaper.GetSetProjectInfo_String(0, 'RENDER_FILE', C.render_dir, true)
  reaper.GetSetProjectInfo_String(0, 'RENDER_PATTERN', 'stereo-routing-proof', true)
  reaper.GetSetProjectInfo_String(0, 'RENDER_FORMAT', 'ZXZhdxgAAQ==', true)
  reaper.GetSetProjectInfo_String(0, 'RENDER_FORMAT2', '', true)
  reaper.SetEditCurPos(0, false, false)
  reaper.UpdateArrange()
  assert(not io.open(C.cancel, 'r'), 'Build cancelled')
  reaper.Main_SaveProjectEx(0, C.project, 8)
  assert(reaper.GetTrackNumSends(master, 1) == 0)
  write(C.readback, json(report) .. '\n')
end
local ok, err = xpcall(build, debug.traceback)
if not ok then write(C.error, err) end
