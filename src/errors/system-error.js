/**
 * @file src/errors/system-error.js
 * @description Базовый класс для системных ошибок
 * @version 0.2.0
 */

/**
 * Форматирует сообщение, подставляя значения из контекста.
 * Используется для создания финального сообщения ошибки.
 * Детерминированность: Да.
 *
 * @param {string} template - Шаблон сообщения с {placeholders}.
 * @param {object} [context={}] - Объект со значениями для подстановки.
 * @returns {string} Отформатированное сообщение. Пустая строка, если template не строка.
 * @private
 */
function formatMessage (template, context = {}) {
  if (typeof template !== 'string') {
    return '' // Возвращаем пустую строку, если шаблон некорректен
  }
  // Используем ?.toString() для безопасного преобразования,
  // возвращаем исходный match ({key}), если значение null или undefined.
  return template.replace(/{(\w+)}/g, (match, key) => {
    const value = context?.[key]
    return value !== undefined && value !== null ? value.toString() : match
  })
}

/**
 * Базовый класс системных ошибок.
 * Расширяет стандартный Error, добавляя структурированные метаданные:
 * код ошибки, подсистему, контекст, флаг восстанавливаемости,
 * ссылку на документацию и поддержку цепочки ошибок (`original`).
 * Предоставляет методы для форматирования (`format`) и сериализации (`toJSON`).
 *
 * @class SystemError
 * @extends Error
 */
export class SystemError extends Error {
  /**
   * Создает экземпляр системной ошибки.
   * Валидирует контекст в строгом режиме, если заданы `definition.contextKeys`.
   *
   * @param {object} definition - Определение ошибки (из ERROR_CODES).
   * @param {string} definition.code - Код ошибки (например, 'SYS_VALIDATION_FAILED').
   * @param {string} definition.message - Шаблон сообщения с плейсхолдерами {key}.
   * @param {string} definition.subsystem - Имя подсистемы-источника ошибки.
   * @param {boolean} [definition.recoverable=true] - Можно ли программно восстановиться после этой ошибки.
   * @param {string[]} [definition.contextKeys=[]] - Массив имен ключей, которые должны присутствовать в `context`.
   * @param {string} [definition.docs] - URL или путь к документации по этой ошибке.
   * @param {object} [context=null] - Объект с дополнительными данными об ошибке. Значения используются для подстановки в `message`.
   * @param {Error} [originalError=null] - Исходная ошибка (для построения цепочки).
   * @param {object} [options={}] - Опции создания ошибки.
   * @param {boolean} [options.strict] - Строгий режим валидации контекста (по умолчанию зависит от NODE_ENV).
   * @throws {Error} Выбрасывает стандартную Error, если в строгом режиме (`strict=true`) в `context` отсутствуют ключи, перечисленные в `definition.contextKeys`. Это прерывает создание некорректной ошибки.
   */
  constructor (definition, context = null, originalError = null, options = {}) {
    // 1. Проверка базового определения (наличие code и message)
    //    Предполагается, что эта проверка уже выполнена в `createError`,
    //    но можно добавить дублирующую для надежности.
    if (typeof definition?.code !== 'string' || typeof definition?.message !== 'string') {
      // Внутренняя ошибка - определение некорректно передано в конструктор.
      // Выбрасываем стандартную ошибку, так как SystemError создать не можем.
      throw new Error('SystemError constructor: Invalid or incomplete error definition passed.')
    }

    // 2. Формируем сообщение ДО вызова super(), чтобы оно было доступно сразу.
    const formattedMessage = formatMessage(definition.message, context || {})

    // 3. Вызываем конструктор родительского класса Error.
    super(formattedMessage)

    // 4. Устанавливаем стандартные свойства Error.
    this.name = this.constructor.name // Имя класса (SystemError или наследника)

    // 5. Устанавливаем кастомные свойства SystemError.
    this.code = definition.code
    this.msg = definition.message // Сохраняем исходный шаблон
    this.subsystem = definition.subsystem || 'unknown'
    this.context = context || {} // Гарантируем, что context всегда объект
    this.recoverable = definition.recoverable !== false // По умолчанию true
    this.original = (originalError instanceof Error) ? originalError : null // Сохраняем только реальные ошибки
    this.docs = definition.docs

    // 6. Валидация обязательных ключей контекста (только в строгом режиме)
    const strict = options.strict ?? process.env.NODE_ENV !== 'production'
    if (strict && Array.isArray(definition.contextKeys) && definition.contextKeys.length > 0) {
      const missingKeys = definition.contextKeys.filter(key => !(key in this.context))
      if (missingKeys.length > 0) {
        // Выбрасываем стандартную ошибку, так как ошибка уже частично создана,
        // но не соответствует требованиям определения.
        throw new Error(
          `SystemError [${this.code}]: Missing required context keys: ${missingKeys.join(', ')}. Provided context: ${JSON.stringify(this.context)}`
        )
      }
    }

    // 7. Захватываем стек вызовов, исключая сам конструктор SystemError.
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor)
    } else {
      this.stack = (new Error(formattedMessage)).stack // Fallback для старых сред
    }
  }

  /**
   * Форматирует ошибку для вывода пользователю или в лог в читаемом виде.
   * Включает основное сообщение, документацию и сообщение исходной ошибки.
   * Детерминированность: Да (для неизменного состояния ошибки).
   *
   * @returns {string} Отформатированное многострочное сообщение об ошибке.
   */
  format () {
    let result = `${this.name} [${this.code}]: ${this.message}`

    if (this.docs) {
      result += `\n  Docs: ${this.docs}`
    }

    // Добавляем информацию об оригинальной ошибке, если она есть
    if (this.original) {
      result += `\n  Caused by: ${this.original.name || 'Error'}: ${this.original.message}`
      // Можно добавить и стек оригинальной ошибки при необходимости
      // if (this.original.stack) {
      //   result += `\n  Original Stack: ${this.original.stack}`;
      // }
    }

    return result
  }

  /**
   * Сериализует ошибку в JSON-совместимый объект для логирования или передачи.
   * Включает все ключевые свойства ошибки, включая базовые и кастомные.
   * Обрабатывает оригинальную ошибку рекурсивно (если она тоже SystemError) или берет базовые поля.
   * Детерминированность: Да (для неизменного состояния ошибки).
   *
   * @returns {object} Сериализованное представление ошибки.
   */
  toJSON () {
    let originalErrorJSON
    if (this.original) {
      if (typeof this.original.toJSON === 'function') {
        // Если у оригинальной ошибки есть свой toJSON (например, это тоже SystemError)
        originalErrorJSON = this.original.toJSON()
      } else {
        // Иначе берем базовые поля стандартной ошибки
        originalErrorJSON = {
          name: this.original.name,
          message: this.original.message,
          stack: this.original.stack
        }
      }
    }

    return {
      name: this.name,
      code: this.code,
      message: this.message, // Отформатированное сообщение
      msg: this.msg, // Шаблон сообщения
      subsystem: this.subsystem,
      context: this.context,
      recoverable: this.recoverable,
      docs: this.docs,
      stack: this.stack,
      original: originalErrorJSON // Включаем сериализованную оригинальную ошибку
    }
  }
}
