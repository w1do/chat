// Единственный экземпляр Laravel Echo создаётся здесь из runtime-конфига
// и передаётся feature-пакетам через провайдер (подключение — этап 7).
import type { RuntimeConfig } from './runtime-config';

export function createEcho(config: RuntimeConfig): null {
  void config; // Echo/Reverb подключаются на этапе 7 (real-time).
  return null;
}
