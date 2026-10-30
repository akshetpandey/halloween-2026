#!/usr/bin/env python3
"""Native four-channel test render -> simulated phone recording -> native preset readback."""
import json
from pathlib import Path
import subprocess
import numpy as np
import calibrate as c
import prepare as p


def main():
    now = p.datetime.now(p.ZoneInfo('America/New_York'))
    root = p.HERE/'.local'/('calibration-proof-'+now.strftime('%Y%m%d-%H%M%S%z'))
    root.mkdir(parents=True, exist_ok=False)
    profile = p.offline_profile(root, p.DEFAULT_SEED)
    source = c.generate(root)
    native = p.build(root, profile, source, proof=True, source_channels=4)
    with (root/'render.log').open('w') as log:
        subprocess.run([str(p.REAPER),'-newinst','-nosplash','-cfgfile',str(profile),
            '-renderproject',native['project']], check=True, timeout=60,
            stdout=log,stderr=subprocess.STDOUT)
    raw = subprocess.check_output(['ffmpeg','-v','error','-i',str(root/'stereo-routing-proof.wav'),
        '-ar',str(c.FS),'-f','f32le','-c:a','pcm_f32le','-'])
    channels = np.frombuffer(raw,dtype='<f4').reshape(-1,4)
    # Native proof includes 120 ms on A only. Simulated devices add 188 ms to H
    # relative to A, so the recorded remaining H offset must be 68 ms.
    recording = np.zeros(len(channels)+c.FS)
    for index, delay in enumerate((.012,.014,.200,.202)):
        room = np.zeros(round(.06*c.FS)); room[0]=1
        room[round(.018*c.FS)]=.3; room[round(.047*c.FS)]=.12
        heard = c.convolution(channels[:,index],room)
        start=round(delay*c.FS)
        recording[start:start+len(heard)]+=heard
    recording=c.convolution(recording,np.array([1,-.7]))
    scale=1.00012
    recording=np.interp(np.arange(round(len(recording)*scale))/scale,np.arange(len(recording)),recording)
    recording=np.r_[np.zeros(round(2.1*c.FS)),recording]
    recording+=np.random.default_rng(431).normal(scale=.000005,size=len(recording))
    analyzed=c.analyze(recording)
    assert abs(analyzed['hisense_later_than_audioengine_ms']-68)<2, analyzed['add_delay_ms']
    c.write_results(root/'analysis',analyzed)
    application=dict(analyzed)
    application['bus_gain_db']={'audioengine':0,'hisense':-2}
    application['eq_candidates']={'audioengine':[{'frequency_hz':250,'gain_db':-3,
        'bandwidth_octaves':1.5}],'hisense':[]}
    application['eq_automatic_allowed']=True
    c.write_results(root/'apply-test',application,include_eq=True)
    apply_root=root/'native-apply'; apply_root.mkdir()
    pulse=apply_root/'pulses.wav'; p.synthetic_source(pulse)
    applied=p.build(apply_root,profile,pulse,preset=root/'apply-test/preset.tsv')['applied_calibration']
    assert applied['audioengine']['delay_ms']==analyzed['add_delay_ms']['audioengine']
    assert abs(applied['hisense']['gain_db']+2)<.01
    assert abs(float(applied['audioengine']['filters'][0]['gain_readout'].split()[0])+3)<.11
    result={'date':now.date().isoformat(),'timezone':'America/New_York',
        'native_render_channels':4,'native_source_seconds':69,
        'synthetic_combined_pipeline_expected_offset_ms':68,
        'recovered_offset_ms':analyzed['hisense_later_than_audioengine_ms'],
        'phone_clock_expected_ppm':120,'phone_clock_recovered_ppm':analyzed['recording_clock_ppm'],
        'native_preset_application':applied,'hardware_outputs_opened':False,
        'real_phone_recording_analyzed':False}
    (root/'verification.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))


if __name__=='__main__':
    main()
