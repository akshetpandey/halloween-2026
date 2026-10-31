#!/usr/bin/env python3
"""Create the party's four-channel AUX + optical aggregate via CoreAudio, not UI."""
import argparse
import ctypes as c
import json
import plistlib
import sys

NAME = 'Halloween Stereo'
UID = 'com.hollowcourt.stereo-output'


class Address(c.Structure):
    _fields_ = [('selector', c.c_uint32), ('scope', c.c_uint32), ('element', c.c_uint32)]


class Buffer(c.Structure):
    _fields_ = [('channels', c.c_uint32), ('size', c.c_uint32), ('data', c.c_void_p)]


class BufferList(c.Structure):
    _fields_ = [('count', c.c_uint32), ('buffers', Buffer * 1)]


def fourcc(value):
    return int.from_bytes(value.encode('ascii'), 'big')


class CoreAudio:
    def __init__(self):
        self.ca = c.CDLL('/System/Library/Frameworks/CoreAudio.framework/CoreAudio')
        self.cf = c.CDLL('/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation')
        self.ca.AudioObjectGetPropertyDataSize.argtypes = [c.c_uint32, c.POINTER(Address), c.c_uint32, c.c_void_p, c.POINTER(c.c_uint32)]
        self.ca.AudioObjectGetPropertyData.argtypes = [c.c_uint32, c.POINTER(Address), c.c_uint32, c.c_void_p, c.POINTER(c.c_uint32), c.c_void_p]
        self.ca.AudioObjectSetPropertyData.argtypes = [c.c_uint32, c.POINTER(Address), c.c_uint32, c.c_void_p, c.c_uint32, c.c_void_p]
        self.ca.AudioHardwareCreateAggregateDevice.argtypes = [c.c_void_p, c.POINTER(c.c_uint32)]
        self.cf.CFStringGetCString.argtypes = [c.c_void_p, c.c_void_p, c.c_long, c.c_uint32]
        self.cf.CFDataCreate.argtypes = [c.c_void_p, c.c_void_p, c.c_long]
        self.cf.CFDataCreate.restype = c.c_void_p
        self.cf.CFPropertyListCreateWithData.argtypes = [c.c_void_p, c.c_void_p, c.c_ulong, c.c_void_p, c.c_void_p]
        self.cf.CFPropertyListCreateWithData.restype = c.c_void_p
        self.cf.CFPropertyListCreateData.argtypes = [c.c_void_p, c.c_void_p, c.c_long, c.c_ulong, c.c_void_p]
        self.cf.CFPropertyListCreateData.restype = c.c_void_p
        self.cf.CFDataGetLength.argtypes = [c.c_void_p]
        self.cf.CFDataGetLength.restype = c.c_long
        self.cf.CFDataGetBytePtr.argtypes = [c.c_void_p]
        self.cf.CFDataGetBytePtr.restype = c.c_void_p
        self.cf.CFRelease.argtypes = [c.c_void_p]

    def check(self, status):
        if status:
            raise RuntimeError(f'CoreAudio error {status}; no fallback device was selected')

    def get(self, device, selector, scope='glob'):
        address = Address(fourcc(selector), fourcc(scope), 0)
        size = c.c_uint32()
        self.check(self.ca.AudioObjectGetPropertyDataSize(device, c.byref(address), 0, None, c.byref(size)))
        raw = c.create_string_buffer(size.value)
        self.check(self.ca.AudioObjectGetPropertyData(device, c.byref(address), 0, None, c.byref(size), raw))
        return raw.raw

    def string(self, device, selector):
        value = c.c_void_p.from_buffer_copy(self.get(device, selector))
        text = c.create_string_buffer(2048)
        try:
            if not self.cf.CFStringGetCString(value, text, len(text), 0x08000100):
                raise RuntimeError('CoreAudio string conversion failed')
            return text.value.decode('utf-8')
        finally:
            self.cf.CFRelease(value)

    def composition(self, device):
        value = c.c_void_p.from_buffer_copy(self.get(device, 'acom'))
        data = self.cf.CFPropertyListCreateData(None, value, 100, 0, None)
        try:
            if not data:
                raise RuntimeError('Could not inspect aggregate composition')
            return plistlib.loads(c.string_at(self.cf.CFDataGetBytePtr(data), self.cf.CFDataGetLength(data)))
        finally:
            if data:
                self.cf.CFRelease(data)
            self.cf.CFRelease(value)

    def channels(self, device):
        raw = self.get(device, 'slay', 'outp')
        count = c.c_uint32.from_buffer_copy(raw).value
        return sum(Buffer.from_buffer_copy(raw, BufferList.buffers.offset + i*c.sizeof(Buffer)).channels for i in range(count))

    def rate(self, device):
        return c.c_double.from_buffer_copy(self.get(device, 'nsrt')).value

    def create(self, description, existing=None):
        raw = plistlib.dumps(description)
        data = self.cf.CFDataCreate(None, raw, len(raw))
        value = self.cf.CFPropertyListCreateWithData(None, data, 0, None, None)
        try:
            if not value:
                raise RuntimeError('Could not construct aggregate description')
            if existing is not None:
                address = Address(fourcc('acom'), fourcc('glob'), 0)
                pointer = c.c_void_p(value)
                self.check(self.ca.AudioObjectSetPropertyData(existing, c.byref(address), 0, None,
                    c.sizeof(pointer), c.byref(pointer)))
                return existing
            device = c.c_uint32()
            self.check(self.ca.AudioHardwareCreateAggregateDevice(value, c.byref(device)))
            return device.value
        finally:
            if value:
                self.cf.CFRelease(value)
            self.cf.CFRelease(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--create', action='store_true', help='Create the dedicated aggregate if absent; never changes the default output')
    args = parser.parse_args()
    audio = CoreAudio()
    default_before = audio.get(1, 'dOut')
    raw = audio.get(1, 'dev#')
    devices = [{'id': i, 'name': audio.string(i, 'lnam'), 'uid': audio.string(i, 'uid ')}
               for i in (c.c_uint32 * (len(raw)//4)).from_buffer_copy(raw)]
    headphones = [d for d in devices if d['uid'] == 'BuiltInHeadphoneOutputDevice']
    optical = [d for d in devices if d['name'] == 'USB SPDIF Audio']
    if len(headphones) != 1 or len(optical) != 1:
        raise RuntimeError('Connect exactly one USB SPDIF Audio adapter and the headphone/AUX cable first')
    pair = [headphones[0], optical[0]]
    for device in pair:
        if audio.channels(device['id']) != 2 or audio.rate(device['id']) != 48000:
            raise RuntimeError(f"Set {device['name']} to 48 kHz stereo first")
    found = [d for d in devices if d['uid'] == UID]
    created = False
    description = {'uid': UID, 'name': NAME, 'private': 0, 'stacked': 0,
        'master': pair[0]['uid'], 'subdevices': [
            {'uid': pair[0]['uid'], 'drift': 0}, {'uid': pair[1]['uid'], 'drift': 1}]}
    if found:
        device_id = found[0]['id']
        previous = audio.composition(device_id)
        if (args.create and previous.get('stacked')
                and [d['uid'] for d in previous['subdevices']] == [d['uid'] for d in pair]):
            audio.create(description, existing=device_id)
    elif args.create:
        device_id = audio.create(description)
        created = True
    else:
        print(json.dumps({'ready': True, 'aggregate_exists': False, 'outputs': [d['name'] for d in pair]}))
        return
    state = audio.composition(device_id)
    if ([d['uid'] for d in state['subdevices']] != [d['uid'] for d in pair]
            or state['master'] != pair[0]['uid'] or state.get('stacked', 0)
            or state['subdevices'][0].get('drift', 0) or not state['subdevices'][1].get('drift')):
        raise RuntimeError('Existing aggregate differs from the expected mapping; inspect it manually')
    channels, rate = audio.channels(device_id), audio.rate(device_id)
    if channels != 4 or rate != 48000:
        raise RuntimeError(f'Aggregate exposes {channels} outputs at {rate} Hz; expected four at 48000 Hz')
    if audio.get(1, 'dOut') != default_before:
        raise RuntimeError('Default output unexpectedly changed; inspect Sound settings')
    print(json.dumps({'aggregate': NAME, 'created': created, 'channels': 4, 'sample_rate': 48000,
        'outputs': [{'channels': '1-2', 'name': pair[0]['name'], 'drift_correction': False},
                    {'channels': '3-4', 'name': pair[1]['name'], 'drift_correction': True}],
        'default_output_unchanged': True}, indent=2))


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, OSError, KeyError) as error:
        sys.exit(str(error))
