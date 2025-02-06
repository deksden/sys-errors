/**
 * @file src/errors/system-error.js
 * @description Базовый класс для системных ошибок
 * @version 0.1.1
 */

/**
 * Зависимости модуля
 */
export const dependencies = {
  logger: null // Логгер будет внедрен после инициализации
}

/**
 * Устанавливает зависимости модуля
 * @param {Partial<typeof dependencies>} newDependencies - Новые зависимости
 */
export function setDependencies (newDependencies) {
  Object.assign(dependencies, newDependencies)
}

/**
 * Форматирует сообщение, подставляя значения из контекста
 *
 * @param {string} template - Шаблон сообщения с {placeholders}
 * @param {Object} [context] - Объект с значениями для подстановки
 * @returns {string} Отформатированное сообщение
 * @private
 */
function formatMessage (template, context = {}) {
  return template.replace(/{(\w+)}/g, (match, key) =>
    context[key]?.toString() ?? match
  )
}

/**
 * Базовый класс системных ошибок
 *
 * Основная ответственность:
 * - Форматирование сообщений с подстановкой контекста
 * - Хранение метаданных и контекста ошибки
 * - Сохранение цепочки ошибок
 * - Валидация данных об ошибке
 * - Сериализация для логирования
 */
export class SystemError extends Error {
  /**
   * @param {Object} definition - Определение ошибки
   * @param {string} definition.code - Код ошибки
   * @param {string} definition.message - Шаблон сообщения
   * @param {string} definition.subsystem - Подсистема
   * @param {boolean} [definition.recoverable] - Можно ли восстановиться
   * @param {string[]} [definition.contextKeys] - Обязательные ключи контекста
   * @param {string} [definition.docs] - Ссылка на документацию
   * @param {Object} [context] - Контекст ошибки
   * @param {Error} [originalError] - Исходная ошибка
   * @param {Object} [options] - Опции создания ошибки
   * @param {boolean} [options.strict=true] - Строгий режим валидации
   */
  constructor (definition, context, originalError, options) {
    // Режим валидации
    const strict = options?.strict ?? process.env.NODE_ENV !== 'production'

    // Валидация определения
    if (strict) {
      if (!definition?.code || !definition?.message) {
        throw new Error('Invalid error definition: missing required fields')
      }

      // Проверяем шаблон сообщения и контекст
      const placeholders = definition.message.match(/{(\w+)}/g) || []
      const missingKeys = placeholders
        .map(p => p.slice(1, -1))
        .filter(key => !(key in (context || {})))

      if (missingKeys.length > 0) {
        throw new Error(
          `Missing required context keys: ${missingKeys.join(', ')}`
        )
      }

      // Проверяем обязательные ключи контекста
      if (definition.contextKeys?.length > 0) {
        const missingRequired = definition.contextKeys
          .filter(key => !(key in (context || {})))

        if (missingRequired.length > 0) {
          throw new Error(
            `Missing required context keys: ${missingRequired.join(', ')}`
          )
        }
      }
    }

    // Форматируем сообщение
    const message = formatMessage(definition.message, context)
    super(message)

    // Метаданные
    this.msg = definition.message
    this.name = 'SystemError'
    this.code = definition.code
    this.subsystem = definition.subsystem
    this.context = context || {}
    this.recoverable = definition.recoverable ?? true
    this.original = originalError
    this.docs = definition.docs

    // Не включаем конструктор в стек
    Error.captureStackTrace(this, this.constructor)

    // Логируем создание если логгер установлен
    const { logger } = dependencies
    if (logger) {
      logger.debug(this.toJSON(), 'SystemError created')
    }
  }

  /**
   * Форматирует ошибку для вывода пользователю
   *
   * @returns {string} Отформатированное сообщение об ошибке
   */
  format () {
    let result = this.message

    if (this.docs) {
      result += `\nSee: ${this.docs}`
    }

    if (this.original) {
      result += `\nCaused by: ${this.original.message}`
    }

    return result
  }

  /**
   * Сериализует ошибку для логирования
   *
   * @returns {Object} Сериализованное представление ошибки
   */
  toJSON () {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      msg: this.msg,
      subsystem: this.subsystem,
      context: this.context,
      recoverable: this.recoverable,
      docs: this.docs,
      stack: this.stack,
      original: this.original
        ? {
            message: this.original.message,
            stack: this.original.stack
          }
        : undefined
    }
  }
}
