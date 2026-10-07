import { DeviceScreenFrame, DeviceScreenPlaceholder } from '@cpt/panel-kit';
import type { CSSProperties } from 'react';
import { deviceEntries, deviceScreens } from '../device-registry';
import { format, useMessages } from '../i18n';
import type { PanelBox, PanelRects } from '../panel/rects';
import { IN_SLOT_OPERATION, slotMode } from '../panel/slot-mode';
import { useSessionState, useTrainer } from '../trainer';
import { useDock } from './dock-state';
import { messages } from './messages';
import { SlotMirror } from './SlotMirror';
import { useDeviceSend } from './use-device-send';
import { useSlotSize } from './use-slot-size';

export type DeviceLayerProps = { viewId: string; rects: PanelRects };

const boxStyle = (box: PanelBox): CSSProperties => ({
  left: `${box.left}%`,
  top: `${box.top}%`,
  width: `${box.width}%`,
  height: `${box.height}%`,
});

function InstalledDevice({ installId, box }: { installId: string; box: PanelBox }) {
  const { aircraft } = useTrainer();
  const text = useMessages(messages);
  const dock = useDock();
  const send = useDeviceSend(installId);
  const [slotRef, slotSize] = useSlotSize<HTMLDivElement>();
  const deviceId = aircraft.devices?.[installId]?.device;
  const device = useSessionState((s) => s.state().devices[installId]);

  if (deviceId === undefined || device === undefined) return null;
  const Screen = Object.hasOwn(deviceScreens, deviceId) ? deviceScreens[deviceId] : undefined;
  const entry = Object.hasOwn(deviceEntries, deviceId) ? deviceEntries[deviceId] : undefined;
  const mirror =
    dock?.available === true &&
    entry !== undefined &&
    slotMode(slotSize, entry.floor, IN_SLOT_OPERATION) === 'mirror'
      ? { dock, entry }
      : undefined;

  return (
    <div
      ref={slotRef}
      className="panel-placement"
      data-placement={installId}
      data-kind="device"
      style={boxStyle(box)}
    >
      {Screen === undefined ? (
        <DeviceScreenPlaceholder label={format(text.noScreen, { device: deviceId })} />
      ) : mirror ? (
        <SlotMirror
          deviceId={deviceId}
          entry={mirror.entry}
          on={device.on}
          state={device.state}
          onActivate={() => mirror.dock.open(installId)}
        />
      ) : (
        <DeviceScreenFrame on={device.on} label={deviceId}>
          <Screen on={device.on} state={device.state} send={send} />
        </DeviceScreenFrame>
      )}
    </div>
  );
}

export function DeviceLayer({ rects }: DeviceLayerProps) {
  return Object.entries(rects.devices).map(([installId, box]) => (
    <InstalledDevice key={installId} installId={installId} box={box} />
  ));
}
