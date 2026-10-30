import json
from pathlib import Path
import tempfile
import unittest

from analyze_audio import digest
from source_bindings import verify_components


class ComponentTests(unittest.TestCase):
    def test_only_selected_source_bound_drums_can_become_native_components(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);source=root/'source';source.write_bytes(b'original')
            drums=root/'drums';drums.write_bytes(b'derived drums')
            parent=digest(source);child=digest(drums);index=root/'cues.json'
            index.write_text(json.dumps({'tracks':[{'id':'a','status':'prepared','binding':{'source_sha256':parent},'parts':[{'sha256':child}]}]}))
            report={'tracks':[{'id':'a','source_sha256':parent}],
                'inputs':{'cue_index':str(index),'cue_index_sha256':digest(index)},
                'native_source_bindings':[{'parent_id':'a','parent_sha256':parent,'sha256':sha,'kind':kind} for sha,kind in [(parent,'original'),(child,'drums')]]}
            native={'tracks':[{'path':str(source),'sha256':parent},{'path':str(drums),'sha256':child}]}
            verify_components(report,native,{'a':parent})
            report['native_source_bindings'][1]['parent_id']='b'
            with self.assertRaisesRegex(ValueError,'not selected'):verify_components(report,native,{'a':parent,'b':parent})
            report['native_source_bindings'][1]['parent_id']='a'
            drums.write_bytes(b'changed stem')
            with self.assertRaisesRegex(ValueError,'file changed'):verify_components(report,native,{'a':parent})

    def test_changing_frozen_derived_registry_invalidates_the_plan(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory)/'cues.json';p.write_text('{}');sha=digest(p);p.write_text('{"changed":true}')
            report={'tracks':[],'native_source_bindings':[], 'inputs':{'cue_index':str(p),'cue_index_sha256':sha}}
            with self.assertRaisesRegex(ValueError,'cue evidence changed'):verify_components(report,{'tracks':[]},{})
