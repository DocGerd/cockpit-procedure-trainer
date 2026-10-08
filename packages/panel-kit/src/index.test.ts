import type { ControlDefinition, ControlPosition, IndicatorValue, JsonObject } from '@cpt/core';
import type { ComponentType } from 'react';
import { describe, expectTypeOf, it } from 'vitest';
import type {
  ControlWidget,
  ControlWidgetProps,
  DeviceScreenProps,
  IndicatorWidget,
  IndicatorWidgetProps,
} from './index';

describe('widget props', () => {
  it('gives a control widget its definition, position, resolved strings and input callbacks', () => {
    expectTypeOf<ControlWidgetProps>().toEqualTypeOf<{
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
    }>();
  });

  it('gives an indicator widget its value, resolved label and blink', () => {
    expectTypeOf<IndicatorWidgetProps>().toEqualTypeOf<{
      value: IndicatorValue;
      label: string;
      options?: JsonObject;
      blink?: boolean;
    }>();
  });

  it('types widgets as React components of their props', () => {
    expectTypeOf<ControlWidget>().toEqualTypeOf<ComponentType<ControlWidgetProps>>();
    expectTypeOf<IndicatorWidget>().toEqualTypeOf<ComponentType<IndicatorWidgetProps>>();
  });

  it('gives a device screen its power, state and a send callback', () => {
    expectTypeOf<DeviceScreenProps>().toEqualTypeOf<{
      on: boolean;
      state: unknown;
      send(
        controlId: string,
        action: 'set' | 'press' | 'release',
        position?: ControlPosition,
      ): void;
    }>();
  });
});
