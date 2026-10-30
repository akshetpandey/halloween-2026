"""Long programme gates, frame-contiguous chapters and native seam verification."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from render_set import chapter_bounds,chapter_tempo_map,measure,preview_file,render,deliver,stage_chapter,verify_seam


class RenderTests(unittest.TestCase):
    @unittest.skipUnless(importlib.util.find_spec('soundfile') and importlib.util.find_spec('numpy'),'audio environment required')
    def test_preview_encodes_actual_fades_and_exact_excerpt_duration(self):
        import numpy as np
        import soundfile as sf
        import subprocess
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);source=root/'tone.wav';target=root/'preview.mp3'
            t=np.arange(8*48000)/48000
            sf.write(source,np.repeat((.1*np.cos(2*np.pi*271*t))[:,None],2,axis=1),48000,subtype='PCM_24')
            result=preview_file(source,target,1,5)
            self.assertAlmostEqual(result['duration_seconds'],5,delta=.06)
            raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(target),'-f','f32le','-c:a','pcm_f32le','-'])
            signal=np.frombuffer(raw,'<f4').reshape(-1,2)
            middle=np.mean(np.abs(signal[48000:96000]))
            self.assertLess(np.mean(np.abs(signal[:240])),middle*.3)
            self.assertLess(np.mean(np.abs(signal[-240:])),middle*.1)

    @unittest.skipUnless(importlib.util.find_spec('soundfile') and importlib.util.find_spec('numpy'),'audio environment required')
    def test_transparent_meter_matches_steady_reference_and_known_power_change(self):
        import numpy as np
        import soundfile as sf
        from actual_audition import measure as reference
        with tempfile.TemporaryDirectory() as directory:
            target=Path(directory)/'dynamics.wav';times=np.arange(32*48000)/48000
            signal=np.sin(2*np.pi*271*times)*.1
            sf.write(target,np.repeat(signal[:,None],2,axis=1),48000,subtype='PCM_24')
            a,b=measure(target),reference(target)
            for key in ['integrated_lufs','true_peak_dbfs']:
                self.assertAlmostEqual(a[key],b[key],delta=.11)
            self.assertEqual(a['duration_seconds'],32)
            sf.write(target,np.repeat((signal*np.where(times<20,1,2))[:,None],2,axis=1),48000,subtype='PCM_24')
            dynamic=measure(target)
            expected=a['integrated_lufs']+10*np.log10((20+12*4)/32)
            self.assertAlmostEqual(dynamic['integrated_lufs'],expected,delta=.15)

    def test_chapters_cover_the_exact_frame_count_without_gaps(self):
        bounds=chapter_bounds(32401.12345)
        self.assertEqual(bounds[0][0],0)
        self.assertAlmostEqual(bounds[-1][1],round(32401.12345*48000)/48000)
        self.assertTrue(all(a[1]==b[0] for a,b in zip(bounds,bounds[1:])))
        self.assertTrue(all(b-a<=3600 for a,b in bounds))

    @unittest.skipUnless(importlib.util.find_spec('numpy'),'analysis environment required')
    def test_bounded_tempo_map_preserves_linear_interpolation_with_handles(self):
        import numpy as np
        points=[{'time':i*10,'bpm':120+i%9} for i in range(1000)]
        subset=chapter_tempo_map(points,1500,1600)
        self.assertLess(len(subset),20)
        for t in np.linspace(1492,1608,200):
            a=np.interp(t,[p['time'] for p in points],[p['bpm'] for p in points])
            b=np.interp(t,[p['time'] for p in subset],[p['bpm'] for p in subset])
            self.assertEqual(a,b)

    def test_invalid_chapter_requests_fail(self):
        for duration,maximum in [(0,3600),(-1,3600),(float('nan'),3600),(20,0),(20,5401)]:
            with self.assertRaises(ValueError):chapter_bounds(duration,maximum)

    def test_loops_cannot_fill_a_short_final_programme(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);p=root/'mix.json'
            p.write_text(json.dumps({'planned_seconds':33000,'planned_seconds_excluding_bridges':32399}))
            with patch('render_set.validate_current',return_value={}):
                with self.assertRaisesRegex(ValueError,'excluding loop padding'):
                    render(p,root/'db',root/'output',root/'reaper',root/'profile')

    def test_full_render_and_delivery_block_legacy_bpm_key_only_joins(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);p=root/'mix.json'
            p.write_text(json.dumps({'planned_seconds':33000,'planned_seconds_excluding_bridges':33000,
                'tracks':[{'source_sha256':'a'*64},{'source_sha256':'b'*64}],
                'transitions':[{'kind':'harmonic_blend','bars':16,'harmonic_cost':0}]}))
            with patch('render_set.validate_current',return_value={}):
                with self.assertRaisesRegex(ValueError,'arrangement design'):
                    render(p,root/'db',root/'out',root/'reaper',root/'profile')
                with self.assertRaisesRegex(ValueError,'arrangement design'):
                    deliver(p,root/'out',root/'db')

    @unittest.skipUnless(importlib.util.find_spec('soundfile') and importlib.util.find_spec('numpy'),'audio environment required')
    def test_staging_selects_active_sources_and_rejects_changed_pcm_evidence(self):
        import numpy as np
        import soundfile as sf
        from analyze_audio import digest
        from compact_audio import pcm_identity
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);source=root/'source.wav'
            sf.write(source,np.zeros((48000,2)),48000,subtype='FLOAT')
            identity,frames=pcm_identity(source)
            analysis=root/'analysis.json'
            analysis.write_text(json.dumps({'tracks':[{'id':'active','analysis_pcm_sha256':identity,'analysis_pcm_frames':frames}]}))
            definition={'path':str(source),'sha256':digest(source),'clips':[{'position':0,'length':1}]}
            native={'tracks':[definition,{**definition,'clips':[{'position':10,'length':1}]}]}
            report={'inputs':{'analysis':str(analysis)},'tracks':[{'id':'active'},{'id':'inactive'}]}
            staged=stage_chapter(native,report,root/'stage',0,2)
            self.assertEqual(len(staged),1)
            self.assertEqual(pcm_identity(Path(staged[0]['path'])),(identity,frames))
            analysis.write_text(json.dumps({'tracks':[{'id':'active','analysis_pcm_sha256':'wrong','analysis_pcm_frames':frames}]}))
            with self.assertRaisesRegex(ValueError,'PCM does not match'):
                stage_chapter(native,report,root/'bad-stage',0,2)

    @unittest.skipUnless(importlib.util.find_spec('soundfile') and importlib.util.find_spec('numpy'),'audio environment required')
    def test_seam_compares_the_same_absolute_audio_and_rejects_discontinuity(self):
        import numpy as np
        import soundfile as sf
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);t=np.arange(10*48000)/48000
            signal=np.repeat((.2*np.sin(2*np.pi*137*t))[:,None],2,axis=1)
            a=root/'a.wav';b=root/'b.wav'
            sf.write(a,signal[:6*48000],48000,subtype='FLOAT')
            sf.write(b,signal[3*48000:],48000,subtype='FLOAT')
            previous={'native':str(a),'render_start':0};incoming={'native':str(b),'render_start':3}
            self.assertEqual(verify_seam(previous,incoming,4)['maximum_pcm_error'],0)
            sf.write(b,-signal[3*48000:],48000,subtype='FLOAT')
            with self.assertRaisesRegex(ValueError,'discontinuity'):verify_seam(previous,incoming,4)


if __name__=='__main__':unittest.main()
