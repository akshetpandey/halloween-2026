-- Open the prepared raw test in this same REAPER instance/device setup.
local _, version = reaper.GetProjExtState(0, 'HalloweenOutput', 'version')
assert(version == 'stereo-1', 'Open the stereo party player first')
assert(reaper.GetPlayState() == 0, 'Stop playback first')
local folder = debug.getinfo(1,'S').source:sub(2):match('^(.*[/\\])')
local f = assert(io.open(folder..'.local/calibration-project.txt','r'), 'Prepare the calibration project first')
local path = f:read('*l'); f:close()
local saved = assert(io.open(path,'r'), 'Calibration project is missing'); saved:close()
local old = reaper.GetMasterTrack(0)
local mappings = {}
for i = 0, reaper.GetTrackNumSends(old,1)-1 do
  mappings[#mappings+1] = {source=reaper.GetTrackSendInfo_Value(old,1,i,'I_SRCCHAN'),
    destination=reaper.GetTrackSendInfo_Value(old,1,i,'I_DSTCHAN')}
end
assert(#mappings == 0 or #mappings == 2, 'Expected exactly two stereo output mappings')
assert(reaper.kbd_getTextFromCmd(40859,0):lower():find('new project tab'))
reaper.Main_OnCommand(40859,0)
reaper.Main_openProject(path)
local master = reaper.GetMasterTrack(0)
reaper.SetMediaTrackInfo_Value(master,'B_MUTE',1)
for i = reaper.GetTrackNumSends(master,1)-1,0,-1 do reaper.RemoveTrackSend(master,1,i) end
for _, pair in ipairs(mappings) do
  local send = reaper.CreateTrackSend(master,nil)
  reaper.SetTrackSendInfo_Value(master,1,send,'I_SRCCHAN',pair.source)
  reaper.SetTrackSendInfo_Value(master,1,send,'I_DSTCHAN',pair.destination)
  reaper.SetTrackSendInfo_Value(master,1,send,'I_SENDMODE',0)
  reaper.SetTrackSendInfo_Value(master,1,send,'D_VOL',1)
end
reaper.ShowMessageBox('Raw 69-second test loaded. Keep it flat, with zero delays. '
  .. 'Record on the iPhone before starting. Afterward, switch back to the PARTY tab to apply the analyzed preset.',
  'iPhone measurement',0)
