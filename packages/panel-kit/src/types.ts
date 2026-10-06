import type { ControlDefinition, ControlPosition, IndicatorValue, JsonObject } from '@cpt/core';
import type { ComponentType } from 'react';

export type ControlWidgetProps = {
  control: ControlDefinition;
  position: ControlPosition;
  guardOpen: boolean;
  label: string;
  placard?: string | undefined;
  positionLabels: Readonly<Record<string, string>>;
  options?: JsonObject;
  onSet(position: ControlPosition): void;
  onPress(position?: ControlPosition): void;
  onRelease(): void;
  onOpenGuard(): void;
  onCloseGuard(): void;
};

export type IndicatorWidgetProps = {
  value: IndicatorValue;
  label: string;
  options?: JsonObject;
};

export type ControlWidget = ComponentType<ControlWidgetProps>;
export type IndicatorWidget = ComponentType<IndicatorWidgetProps>;

export type DeviceScreenProps = {
  on: boolean;
  state: unknown;
  send(controlId: string, action: 'set' | 'press' | 'release', position?: ControlPosition): void;
};
