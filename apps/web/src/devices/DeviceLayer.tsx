import type { ControlPosition } from '@cpt/core';
import { DeviceScreenFrame, DeviceScreenPlaceholder } from '@cpt/panel-kit';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import { useCallback } from 'react';
import type { CSSProperties } from 'react';
import { deviceScreens } from '../device-registry';
import { format, useMessages } from '../i18n';
import type { PanelBox, PanelRects } from '../panel/rects';
import { useSessionState, useTrainer } from '../trainer';
import { messages } from './messages';

export type DeviceLayerProps = { viewId: string; rects: PanelRects };

const boxStyle = (box: PanelBox): CSSProperties => ({
  left: `${box.left}%`,
  top: `${box.top}%`,
  width: `${box.width}%`,
  height: `${box.height}%`,
});

function InstalledDevice({ installId, box }: { installId: string; box: PanelBox }) {
  const { aircraft, session } = useTrainer();
  const text = useMessages(messages);
  const deviceId = aircraft.devices?.[installId]?.device;
  const device = useSessionState((s) => s.state().devices[installId]);

  const send = useCallback<DeviceScreenProps['send']>(
    (controlId, action, position?: ControlPosition) => {
      const id = `${installId}.${controlId}`;
      if (action === 'set') {
        if (position !== undefined) {
          session.set(id, position);
        } else {
          const error = new Error(`Device screen sent a set for "${id}" without a position`);
          if (import.meta.env.DEV) throw error;
          console.error(error);
        }
      } else if (action === 'press') {
        if (position === undefined) session.press(id);
        else session.press(id, position);
      } else {
        session.release(id);
      }
    },
    [session, installId],
  );

  if (deviceId === undefined || device === undefined) return null;
  const Screen = Object.hasOwn(deviceScreens, deviceId) ? deviceScreens[deviceId] : undefined;

  return (
    <div
      className="panel-placement"
      data-placement={installId}
      data-kind="device"
      style={boxStyle(box)}
    >
      {Screen ? (
        <DeviceScreenFrame on={device.on} label={deviceId}>
          <Screen on={device.on} state={device.state} send={send} />
        </DeviceScreenFrame>
      ) : (
        <DeviceScreenPlaceholder label={format(text.noScreen, { device: deviceId })} />
      )}
    </div>
  );
}

export function DeviceLayer({ rects }: DeviceLayerProps) {
  return Object.entries(rects.devices).map(([installId, box]) => (
    <InstalledDevice key={installId} installId={installId} box={box} />
  ));
}
