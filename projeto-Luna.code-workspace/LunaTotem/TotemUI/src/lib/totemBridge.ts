import { chamarTotemUI, type TotemSystemPayload } from '../totem-system/bridge/totemBridge';

export type { TotemSystemPayload };

export function irParaTotemSystem(): TotemSystemPayload {
    return chamarTotemUI();
}
