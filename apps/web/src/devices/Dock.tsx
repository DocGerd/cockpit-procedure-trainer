import { DeviceScreenFrame, DeviceScreenPlaceholder } from '@cpt/panel-kit';
import type { CSSProperties } from 'react';
import { deviceScreens } from '../device-registry';
import { format, useMessages } from '../i18n';
import { useGuidedInstall } from '../modes/guided-install';
import { useSessionState, useTrainer } from '../trainer';
import { deviceFloor } from './dock-floor';
import { useDock } from './dock-state';
import { messages } from './messages';
import { useDeviceSend } from './use-device-send';
import './dock.css';

export type DockPlace = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

function DockedDevice({ installId }: { installId: string }) {
  const { aircraft } = useTrainer();
  const text = useMessages(messages);
  const send = useDeviceSend(installId);
  const targeted = useGuidedInstall() === installId;
  const deviceId = aircraft.devices?.[installId]?.device;
  const device = useSessionState((s) => s.state().devices[installId]);
  if (deviceId === undefined || device === undefined) return null;

  const Screen = Object.hasOwn(deviceScreens, deviceId) ? deviceScreens[deviceId] : undefined;
  const floor = deviceFloor(deviceId);
  const sizes =
    floor &&
    ({ '--dock-floor-width': floor.width, '--dock-floor-height': floor.height } as CSSProperties);

  return (
    <div
      className="dock-device"
      data-dock-device={installId}
      data-target={targeted ? 'true' : undefined}
      style={sizes}
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

/**
 * The non-modal region that holds one operable device at a time. Placed by `place` in the combined
 * layout, and in flow below the tab panel without it. Chrome, not panel: its hint never prints on
 * the panel.
 */
export function Dock({ place }: { place?: DockPlace | undefined }) {
  const text = useMessages(messages);
  const dock = useDock();
  if (!dock?.available) return null;
  const { installId } = dock;

  return (
    <section
      className="dock"
      aria-label={text.dock}
      data-dock={installId === undefined ? 'empty' : 'held'}
      data-placed={place ? '' : undefined}
      style={place}
    >
      {installId === undefined ? (
        <p className="dock-hint">{text.dockHint}</p>
      ) : (
        <>
          <DockedDevice installId={installId} />
          <button
            type="button"
            className="chrome-button dock-close"
            aria-label={text.dockClose}
            onClick={dock.close}
          >
            ×
          </button>
        </>
      )}
    </section>
  );
}
