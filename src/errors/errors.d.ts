/**
 * @file src/errors/errors.d.ts
 * @description TypeScript декларации для основного API подсистемы обработки ошибок (@fab33/sys-errors).
 * @version 0.1.8
 */

// Импортируем и ре-экспортируем классы и типы из других модулей
import { ErrorJSON, SystemError as SystemErrorClass } from './system-error'
import { AllErrorCodes, ERROR_CODES as ErrorCodesObject, SystemErrorCodes } from './codes'

// Ре-экспортируем для удобства использования
export { SystemErrorClass as SystemError, ErrorJSON, ErrorCodesObject as ERROR_CODES, AllErrorCodes, SystemErrorCodes }

/**
 * @interface ErrorDefinition
 * @description Определение структуры ошибки, используемое в ERROR_CODES и createError.
 */
export interface ErrorDefinition {
  /** @property {string} code - Уникальный код ошибки (например, 'SYS_VALIDATION_FAILED'). Должен быть в UPPER_SNAKE_CASE. */
  code: string;
  /** @property {string} message - Шаблон сообщения об ошибке с плейсхолдерами вида {key}. */
  message: string;
  /** @property {string} [subsystem='unknown'] - Имя подсистемы-источника ошибки. */
  subsystem?: string;
  /** @property {boolean} [recoverable=true] - Можно ли программно восстановиться после этой ошибки (по умолчанию true). */
  recoverable?: boolean;
  /** @property {string[]} [contextKeys=[]] - Массив имен ключей, которые обязательно должны присутствовать в `context` при создании ошибки в строгом режиме. */
  contextKeys?: string[];
  /** @property {string} [docs] - URL или путь к документации по этой ошибке. */
  docs?: string;
}

/**
 * @interface ErrorChainLevel
 * @description Описывает ожидаемый уровень в цепочке ошибок для функции `checkErrorChain`.
 */
export interface ErrorChainLevel {
  /** @property {string} code - Ожидаемый код ошибки (`error.code`). */
  code: string;
  /** @property {string} [type] - Ожидаемый тип/класс ошибки (`error.constructor.name`, например, 'SystemError', 'TypeError'). */
  type?: string;
  /** @property {string | string[]} [message] - Ожидаемый фрагмент(ы) сообщения для поиска (`error.message`, регистронезависимо). */
  message?: string | string[];
}

/**
 * Форматирует сообщение об ошибке, подставляя значения из контекста в плейсхолдеры.
 *
 * @function formatMessage
 * @param {string | null | undefined} template - Шаблон сообщения с плейсхолдерами вида `{key}`.
 * @param {Record<string, any>} [context={}] - Объект со значениями для подстановки.
 * @returns {string} Отформатированное сообщение. Возвращает пустую строку, если `template` не является строкой. Плейсхолдеры для `null` или `undefined` значений остаются без изменений.
 */
export declare function formatMessage (template: string | null | undefined, context?: Record<string, any>): string;

/**
 * Проверяет валидность объекта определения ошибки.
 *
 * @function validateDefinition
 * @param {any} definition - Проверяемое определение. Ожидается объект.
 * @returns {string[]} Массив строк с описанием найденных проблем. Пустой массив, если определение валидно. Возвращает `['Definition is missing or invalid.']` для `null`, `undefined` или не-объектов.
 */
export declare function validateDefinition (definition: any): string[];

/**
 * Создает экземпляр системной ошибки (SystemError).
 * Является основной фабрикой для создания ошибок в системе.
 * Выполняет валидацию входных данных (definition и context в строгом режиме).
 *
 * @function createError
 * @param {ErrorDefinition} errorDefinition - Определение ошибки из `ERROR_CODES`. Должно быть валидным объектом с `code` и `message`.
 * @param {Record<string, any>} [context=null] - Контекст ошибки для подстановки в сообщение и сохранения.
 * @param {Error} [originalError=null] - Исходная ошибка для построения цепочки ошибок (сохраняется в `error.original`).
 * @param {object} [options={}] - Опции создания ошибки.
 * @param {boolean} [options.strict] - Строгий режим валидации определения и контекста (по умолчанию зависит от `process.env.NODE_ENV !== 'production'`).
 * @returns {SystemErrorClass} Экземпляр системной ошибки. Если `errorDefinition` невалидно в строгом режиме, возвращает ошибку `SYS.VALIDATION_FAILED`. Если происходит внутренняя ошибка конструктора, возвращает `SYS.UNEXPECTED`.
 */
export declare function createError (
  errorDefinition: ErrorDefinition,
  context?: Record<string, any> | null,
  originalError?: Error | null,
  options?: { strict?: boolean }
): SystemErrorClass;

/**
 * Проверяет, соответствует ли цепочка ошибок (`error` и его `original` свойства) ожидаемой структуре.
 * Используется преимущественно в тестах.
 *
 * @function checkErrorChain
 * @param {Error | SystemErrorClass | null} error - Проверяемая ошибка (начало цепочки).
 * @param {ErrorChainLevel[]} expectedChain - Массив объектов, описывающих ожидаемые уровни цепочки (код, тип, сообщение).
 * @returns {boolean} Возвращает `true`, если цепочка соответствует ожиданиям.
 * @throws {Error} Выбрасывает стандартную ошибку, если цепочка не соответствует ожиданиям (сообщение содержит детали несоответствия), или если `expectedChain` не является массивом.
 */
export declare function checkErrorChain (error: Error | SystemErrorClass | null, expectedChain: ErrorChainLevel[]): boolean;

// NOTE: isRecoverable не экспортируется из errors.js в предоставленном коде v0.1.8
// Если она должна экспортироваться, нужно добавить:
// /**
//  * Проверяет, можно ли программно восстановиться после ошибки.
//  * Для SystemError возвращает значение флага `recoverable` (по умолчанию true).
//  * Для стандартных ошибок и других значений возвращает `true`.
//  *
//  * @function isRecoverable
//  * @param {any} error - Проверяемая ошибка или другое значение.
//  * @returns {boolean} `true`, если ошибка считается восстанавливаемой.
//  */
// export declare function isRecoverable(error: any): boolean;

// --- Опционально: Типы для DI (если нужно использовать из TS) ---
/**
 * @typedef {object} ErrorsDependencies
 * @description Тип для объекта зависимостей модуля errors (для DI в тестах).
 */
export interface ErrorsDependencies {
  SystemError: typeof SystemErrorClass;
  ERROR_CODES: AllErrorCodes;
}

/**
 * Устанавливает зависимости модуля (Только для тестирования DI).
 * Позволяет подменить реализации SystemError или ERROR_CODES в тестах.
 *
 * @function setDependencies
 * @param {Partial<ErrorsDependencies>} newDependencies - Объект с новыми зависимостями.
 */
export declare function setDependencies (newDependencies: Partial<ErrorsDependencies>): void;
