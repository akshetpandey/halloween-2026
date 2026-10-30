-- Numeric TSV only: no code is executed from a recording or preset.
local M = {}
function M.apply(path)
  local _, version = reaper.GetProjExtState(0, 'HalloweenOutput', 'version')
  local _, role = reaper.GetProjExtState(0, 'HalloweenOutput', 'role')
  assert(version == 'stereo-1' and role ~= 'calibration', 'Open the dedicated PARTY player, not the raw calibration test')
  assert(reaper.GetPlayState() == 0, 'Stop playback before applying a preset')
  local f = assert(io.open(path, 'r'), 'Preset not found')
  local content = f:read('*a'); f:close()
  local values = {}
  for line in content:gmatch('[^\r\n]+') do
    local key, value = line:match('^([%w_.]+)\t([^\t]+)$')
    assert(key and not values[key], 'Malformed or duplicate preset field')
    values[key] = value
  end
  assert(values.schema == 'phone-stereo-preset-1', 'Unsupported preset schema')
  local allowed = {schema=true}
  local function number(key, lo, hi)
    allowed[key] = true
    local v = tonumber(values[key])
    assert(v and v == v and v >= lo and v <= hi, 'Invalid preset value: ' .. key)
    return v
  end
  local settings = {}
  for i, bus in ipairs({'audioengine', 'hisense'}) do
    local track = assert(reaper.GetTrack(0, i), 'Missing output bus')
    local _, name = reaper.GetSetMediaTrackInfo_String(track, 'P_NAME', '', false)
    assert(name:lower():find(bus, 1, true) == 1, 'Unexpected track order')
    local _, eq_name = reaper.TrackFX_GetFXName(track, 0)
    local _, delay_name = reaper.TrackFX_GetFXName(track, 1)
    assert(eq_name:find('ReaEQ', 1, true) and delay_name:find('Time Adjustment', 1, true), 'Unexpected bus FX')
    local s = {track=track, bus=bus, filters={}, delay_ms=number(bus..'.delay_ms',0,500),
      gain_db=number(bus..'.gain_db',-6,0)}
    local count = number(bus..'.eq_count',0,2)
    assert(count == math.floor(count), 'EQ count must be an integer')
    for band = 1, count do
      local prefix = bus..'.eq'..band..'.'
      s.filters[#s.filters+1] = {frequency_hz=number(prefix..'frequency_hz',120,800),
        gain_db=number(prefix..'gain_db',-3,0),
        bandwidth_octaves=number(prefix..'bandwidth_octaves',1,2)}
    end
    settings[#settings+1] = s
  end
  for key in pairs(values) do assert(allowed[key], 'Unknown preset field: '..key) end
  -- All fields and track identities were checked before any state change.
  local master = reaper.GetMasterTrack(0)
  reaper.SetMediaTrackInfo_Value(master, 'B_MUTE', 1)
  local report = {}
  for _, s in ipairs(settings) do
    local t = s.track
    reaper.SetMediaTrackInfo_Value(t, 'D_VOL', 10^(s.gain_db/20))
    for p, value in ipairs({s.delay_ms,0,-120,0}) do
      assert(reaper.TrackFX_SetParam(t, 1, p-1, value))
    end
    for p = 0, reaper.TrackFX_GetNumParams(t,0)-1 do
      local ok, kind, band, parameter = reaper.TrackFX_GetEQParam(t,0,p)
      if ok and kind >= 0 and parameter == 0 then reaper.TrackFX_SetEQBandEnabled(t,0,kind,band,false) end
    end
    local actual_filters = {}
    for index, band in ipairs(s.filters) do
      local gain_param
      for p = 0, reaper.TrackFX_GetNumParams(t,0)-1 do
        local ok, kind, ordinal, parameter = reaper.TrackFX_GetEQParam(t,0,p)
        if ok and kind == 2 and ordinal == index-1 and parameter == 1 then gain_param = p end
      end
      assert(gain_param, 'ReaEQ bell band unavailable')
      assert(reaper.TrackFX_SetEQParam(t,0,2,index-1,0,band.frequency_hz,false))
      assert(reaper.TrackFX_SetEQParam(t,0,2,index-1,2,band.bandwidth_octaves,false))
      local lo, hi = 0, 1
      for _ = 1, 32 do
        local mid = (lo+hi)/2
        local ok, label = reaper.TrackFX_FormatParamValue(t,0,gain_param,mid)
        local actual = ok and tonumber(label:match('[-+]?%d+%.?%d*'))
        assert(actual, 'Cannot read native EQ gain')
        if actual < band.gain_db then lo=mid else hi=mid end
      end
      assert(reaper.TrackFX_SetParam(t,0,gain_param,(lo+hi)/2))
      assert(reaper.TrackFX_SetEQBandEnabled(t,0,2,index-1,true))
      actual_filters[#actual_filters+1] = {frequency_hz=band.frequency_hz,
        gain_readout=select(2,reaper.TrackFX_GetFormattedParamValue(t,0,gain_param))}
    end
    report[s.bus] = {delay_ms=reaper.TrackFX_GetParam(t,1,0),
      gain_db=20*math.log(reaper.GetMediaTrackInfo_Value(t,'D_VOL'),10), filters=actual_filters}
  end
  reaper.SetProjExtState(0, 'HalloweenOutput', 'calibration_preset', path)
  reaper.MarkProjectDirty(0)
  return report
end
if not PHONE_CALIBRATION_LIBRARY then
  local ok, path = reaper.GetUserFileNameForRead('', 'Select analyzed phone preset.tsv', '.tsv')
  if ok then
    local success, result = pcall(M.apply, path)
    reaper.ShowMessageBox(success and 'Preset applied; MASTER remains muted. Save, lower physical levels, '
      .. 'then unmute and compare with familiar music.' or tostring(result), 'Phone calibration', 0)
  end
end
return M
