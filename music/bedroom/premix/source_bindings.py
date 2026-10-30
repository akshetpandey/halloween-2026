"""Bind native original/stem components to the selected approved recordings."""
import json
from pathlib import Path
from analyze_audio import digest


def verify_components(report,native,allowed):
    bindings=report.get('native_source_bindings')
    if bindings is None:
        if [t['sha256'] for t in native['tracks']] != [t['source_sha256'] for t in report['tracks']]:
            raise ValueError('Native plan no longer matches selected sources')
        return
    if len(bindings)!=len(native['tracks']):raise ValueError('Native component count changed')
    path=Path(report['inputs']['cue_index'])
    if digest(path)!=report['inputs']['cue_index_sha256']:raise ValueError('Frozen cue evidence changed')
    cues=json.loads(path.read_text())['tracks'];registry={}
    for cue in cues:
        if cue['status']!='prepared':continue
        parent=(cue['id'],cue['binding']['source_sha256'])
        for part in cue['parts']:
            registry.setdefault(part['sha256'],set()).add(parent)
    selected={t['id']:t['source_sha256'] for t in report['tracks']}
    for binding,component in zip(bindings,native['tracks'],strict=True):
        ident=binding['parent_id'];parent=binding['parent_sha256']
        if selected.get(ident)!=parent or allowed.get(ident)!=parent:
            raise ValueError('Native component parent is not selected and approved')
        sha=component['sha256']
        if binding['sha256']!=sha or digest(Path(component['path']))!=sha:
            raise ValueError('Native component file changed')
        if binding['kind']=='original':
            if sha!=parent:raise ValueError('Original component is a different source')
        elif binding['kind'] in ('drums','effect'):
            if (ident,parent) not in registry.get(sha,set()):
                raise ValueError('Drum component lacks source-bound cue evidence')
        else:raise ValueError('Unknown native component kind')
