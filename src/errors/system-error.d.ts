/**
 * @file src/errors/system-error.d.ts
 * @description TypeScript декларации для базового класса системных ошибок (SystemError).
 * @version 0.2.0
 */

// Импортируем определение ошибки из главного файла деклараций
import { ErrorDefinition } from './errors'

/**
 * @interface ErrorJSON
 * @description Структура объекта, возвращаемого методом toJSON() класса SystemError.
 */
export interface ErrorJSON {
  name: string;
  code: string;
  message: string; // Отформатированное сообщение
  msg: string;     // Шаблон сообщения
  subsystem: string;
  context: Record<string, any>;
  recoverable: boolean;
  docs?: string;
  stack?: string;
  original?: ErrorJSON | { name?: string; message?: string; stack?: string; }; // Может быть рекурсивным или стандартной ошибкой
}

/**
 * @class SystemError
 * @extends Error
 * @description Базовый класс для системных ошибок.
 * Расширяет стандартный Error, добавляя структурированные метаданные:
 * код ошибки, подсистему, контекст, флаг восстанавливаемости,
 * ссылку на документацию и поддержку цепочки ошибок (`original`).
 * Предоставляет методы для форматирования (`format`) и сериализации (`toJSON`).
 */
export declare class SystemError extends Error {
  /**
   * @property {string} code - Уникальный код ошибки (например, 'SYS_VALIDATION_FAILED').
   */
  readonly code: string

  /**
   * @property {string} msg - Оригинальный шаблон сообщения об ошибке с плейсхолдерами.
   */
  readonly msg: string

  /**
   * @property {string} subsystem - Имя подсистемы, в которой возникла ошибка.
   */
  readonly subsystem: string

  /**
   * @property {Record<string, any>} context - Объект с дополнительными данными об ошибке.
   */
  readonly context: Record<string, any>

  /**
   * @property {boolean} recoverable - Флаг, указывающий, можно ли программно восстановиться после этой ошибки.
   */
  readonly recoverable: boolean

  /**
   * @property {Error | null} original - Исходная ошибка, которая привела к возникновению текущей (для цепочки ошибок).
   */
  readonly original: Error | null

  /**
   * @property {string | undefined} docs - URL или путь к документации по данной ошибке.
   */
  readonly docs?: string

  /**
   * Создает экземпляр системной ошибки.
   *
   * @constructor
   * @param {ErrorDefinition} definition - Определение ошибки (из ERROR_CODES). Должно содержать как минимум `code` и `message`.
   * @param {Record<string, any>} [context=null] - Объект с дополнительными данными об ошибке. Значения используются для подстановки в `message`.
   * @param {Error} [originalError=null] - Исходная ошибка (для построения цепочки). Сохраняется в `this.original`.
   * @param {object} [options={}] - Опции создания ошибки.
   * @param {boolean} [options.strict] - Строгий режим валидации контекста на основе `definition.contextKeys` (по умолчанию зависит от NODE_ENV).
   * @throws {Error} Выбрасывает стандартную Error, если определение `definition` невалидно, или если в строгом режиме (`strict=true`) в `context` отсутствуют ключи, перечисленные в `definition.contextKeys`.
   */
  constructor (
    definition: ErrorDefinition,
    context?: Record<string, any> | null,
    originalError?: Error | null,
    options?: { strict?: boolean }
  );

  /**
   * Форматирует ошибку для вывода пользователю или в лог в читаемом виде.
   * Включает основное сообщение, код, документацию (если есть) и сообщение исходной ошибки (если есть).
   * Детерминированность: Да (для неизменного состояния ошибки).
   *
   * @method format
   * @returns {string} Отформатированное многострочное сообщение об ошибке.
   */
  format (): string;

  /**
   * Сериализует ошибку в JSON-совместимый объект для логирования или передачи.
   * Включает все ключевые свойства ошибки (`code`, `message`, `context`, `stack` и т.д.)
   * и рекурсивно сериализует `original` ошибку, если она есть.
   * Детерминированность: Да (для неизменного состояния ошибки).
   *
   * @method toJSON
   * @returns {ErrorJSON} Сериализованное представление ошибки.
   */
  toJSON (): ErrorJSON;
}