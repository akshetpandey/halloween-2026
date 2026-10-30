-- Run from REAPER's Actions list after selecting the real Aggregate Device.
local _, version = reaper.GetProjExtState(0, 'HalloweenOutput', 'version')
if version ~= 'stereo-1' then
  reaper.ShowMessageBox('Open the dedicated stereo playback project first.', 'Output mapping', 0)
  return
end
if reaper.GetPlayState() ~= 0 then
  reaper.ShowMessageBox('Stop playback before mapping outputs.', 'Output mapping', 0)
  return
end
local names = {}
for i = 0, 63 do
  local name = reaper.GetOutputChannelName(i)
  if not name or name == '' then break end
  names[#names+1] = tostring(i+1) .. ': ' .. name
end
if #names < 4 then
  reaper.ShowMessageBox('Select the Aggregate Device and enable at least four outputs in '
    .. 'Preferences > Audio > Device first.\n\n' .. table.concat(names, '\n'), 'Output mapping', 0)
  return
end
if reaper.ShowMessageBox('Available output channels:\n\n' .. table.concat(names, '\n')
    .. '\n\nIdentify the two physical stereo pairs before mapping.', 'Output channels', 1) ~= 1 then return end
local ok, values = reaper.GetUserInputs('Stereo output mapping (one-based channels)', 2,
  'Audioengine first channel,Hisense first channel', '1,3')
if not ok then return end
local a, b = values:match('^%s*(%d+)%s*,%s*(%d+)%s*$')
a, b = tonumber(a), tonumber(b)
if not a or not b or a < 1 or b < 1 or a+1 > #names or b+1 > #names or math.abs(a-b) < 2 then
  reaper.ShowMessageBox('Choose two distinct, non-overlapping stereo pairs.', 'Output mapping', 0)
  return
end
local message = 'Map Audioengine to ' .. names[a] .. ' / ' .. names[a+1]
  .. '\nMap Hisense to ' .. names[b] .. ' / ' .. names[b+1]
  .. '\n\nMASTER will remain muted at -12 dB. Verify the physical channels at low level.'
if reaper.ShowMessageBox(message, 'Confirm physical output mapping', 1) ~= 1 then return end
local master = reaper.GetMasterTrack(0)
reaper.SetMediaTrackInfo_Value(master, 'B_MUTE', 1)
reaper.SetMediaTrackInfo_Value(master, 'D_VOL', 10^(-12/20))
for i = reaper.GetTrackNumSends(master, 1)-1, 0, -1 do reaper.RemoveTrackSend(master, 1, i) end
for _, pair in ipairs({{source=0, destination=a-1}, {source=2, destination=b-1}}) do
  local send = reaper.CreateTrackSend(master, nil)
  assert(send >= 0)
  reaper.SetTrackSendInfo_Value(master, 1, send, 'I_SRCCHAN', pair.source)
  reaper.SetTrackSendInfo_Value(master, 1, send, 'I_DSTCHAN', pair.destination)
  reaper.SetTrackSendInfo_Value(master, 1, send, 'I_SENDMODE', 0)
  reaper.SetTrackSendInfo_Value(master, 1, send, 'D_VOL', 1)
end
reaper.SetProjExtState(0, 'HalloweenOutput', 'mapping', tostring(a) .. ',' .. tostring(b))
reaper.MarkProjectDirty(0)
reaper.ShowMessageBox('Outputs mapped. MASTER is muted. Save the project, lower speaker '
  .. 'volumes, then unmute MASTER and check each bus separately.', 'Output mapping', 0)
