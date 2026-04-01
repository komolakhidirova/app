import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Функция для анализа слабых тем
function analyzeWeakTopics(answers: any[]): string[] {
	if (!answers || answers.length === 0) return []

	const errorTopics: Set<string> = new Set()

	answers.forEach(a => {
		if (!a.isCorrect) {
			errorTopics.add(a.subtopic)
		}
	})

	return Array.from(errorTopics)
}

// Функция для получения контекста ошибок
function getErrorContext(answers: any[]): string {
	if (!answers || answers.length === 0) return ''

	const errors = answers
		.filter(a => !a.isCorrect)
		.slice(-5)
		.map(
			a =>
				`- Тема "${a.subtopic}": "${a.questionText.substring(
					0,
					80
				)}..." (Ответ: ${a.userAnswer}, Правильно: ${a.correctAnswer})`
		)

	if (errors.length === 0) return ''

	return `\n📌 ОШИБКИ УЧЕНИКА:\n${errors.join('\n')}\n`
}

// Функция для создания 5 вопросов-заглушек
function getFallbackQuestions(batchNumber: number, topic: string): any[] {
	const fallbackQuestions = []

	// 5 разных вопросов-заглушек
	const fallbackPool = [
		{
			text: `Что является основным понятием в теме "${topic}"?`,
			options: [
				'A. Основное понятие 1',
				'B. Основное понятие 2',
				'C. Основное понятие 3',
				'D. Основное понятие 4',
			],
			correctAnswer: 'A',
			subtopic: topic,
		},
		{
			text: `Какое утверждение наиболее точно описывает "${topic}"?`,
			options: [
				'A. Первое утверждение',
				'B. Второе утверждение',
				'C. Третье утверждение',
				'D. Четвертое утверждение',
			],
			correctAnswer: 'A',
			subtopic: topic,
		},
		{
			text: `Что из перечисленного относится к "${topic}"?`,
			options: ['A. Элемент 1', 'B. Элемент 2', 'C. Элемент 3', 'D. Элемент 4'],
			correctAnswer: 'A',
			subtopic: topic,
		},
		{
			text: `Как правильно определить "${topic}"?`,
			options: [
				'A. Определение 1',
				'B. Определение 2',
				'C. Определение 3',
				'D. Определение 4',
			],
			correctAnswer: 'A',
			subtopic: topic,
		},
		{
			text: `Какое ключевое свойство характерно для "${topic}"?`,
			options: [
				'A. Свойство 1',
				'B. Свойство 2',
				'C. Свойство 3',
				'D. Свойство 4',
			],
			correctAnswer: 'A',
			subtopic: topic,
		},
	]

	// Всегда возвращаем 5 вопросов
	for (let i = 0; i < 5; i++) {
		const q = fallbackPool[i]
		fallbackQuestions.push({
			text: q.text,
			options: q.options,
			correctAnswer: q.correctAnswer,
			subtopic: q.subtopic,
		})
	}

	console.log(`📦 Отправляем 5 вопросов-заглушек для пачки ${batchNumber}`)
	return fallbackQuestions
}

export async function POST(req: Request) {
	// Объявляем переменные в начале, чтобы они были доступны в catch
	let batchNumber = 1
	let topic = 'теме'

	try {
		const body = await req.json()
		topic = body.topic || 'теме'
		batchNumber = body.batchNumber || 1
		const totalBatches = body.totalBatches || 2
		const askedQuestions = body.askedQuestions || []
		const answers = body.answers || []

		if (!topic) {
			return NextResponse.json({ error: 'Тема обязательна' }, { status: 400 })
		}

		// Проверка наличия API ключа
		if (!process.env.GEMINI_API_KEY) {
			console.log('⚠️ Нет API ключа, отправляем заглушки')
			const fallbackQuestions = getFallbackQuestions(batchNumber, topic)
			return NextResponse.json({ questions: fallbackQuestions })
		}

		// Анализируем слабые темы
		const weakTopics = analyzeWeakTopics(answers || [])
		const errorContext = getErrorContext(answers || [])

		// Список уже заданных вопросов
		const askedList = askedQuestions || []
		const askedText = askedList
			.slice(-10)
			.map((q: string, i: number) => `${i + 1}. ${q.substring(0, 100)}`)
			.join('\n')

		let weakTopicsContext = ''
		if (weakTopics.length > 0) {
			weakTopicsContext = `
⚠️ ТЕМЫ, В КОТОРЫХ БЫЛИ ОШИБКИ:
${weakTopics.map(t => `- ${t}`).join('\n')}

Ученик ошибался в этих темах. Проверь эти темы снова, но используй ДРУГИЕ вопросы, не повторяй предыдущие.
`
		}

		const prompt = `Ты — адаптивный генератор тестов, который подстраивается под уровень ученика.

ТЕМА: "${topic}"
ПАЧКА: ${batchNumber} из ${totalBatches}
${weakTopicsContext}
${errorContext}

${askedList.length > 0 ? `⚠️ НЕ ПОВТОРЯЙ эти вопросы:\n${askedText}` : ''}

Создай ПАЧКУ ИЗ 5 ВОПРОСОВ. Каждый вопрос должен иметь 4 варианта ответа (A, B, C, D) и только один правильный.

Важно: Если есть темы, в которых были ошибки — обязательно включи вопросы по этим темам, чтобы проверить понимание.

Верни ТОЛЬКО JSON:
{
  "questions": [
    {
      "text": "текст вопроса",
      "options": ["A. вариант 1", "B. вариант 2", "C. вариант 3", "D. вариант 4"],
      "correctAnswer": "A",
      "subtopic": "конкретная подтема"
    }
  ]
}`

		console.log(
			`🤖 Генерируем пачку ${batchNumber} из ${totalBatches} по теме "${topic}"`
		)
		if (weakTopics.length > 0) {
			console.log(`⚠️ Проблемные темы: ${weakTopics.join(', ')}`)
		}

		const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
		const result = await model.generateContent(prompt)
		const responseText = result.response.text()

		// Очистка от markdown
		let cleanedText = responseText.replace(/```json\n?/gi, '')
		cleanedText = cleanedText.replace(/```\n?/g, '')
		cleanedText = cleanedText.trim()

		const data = JSON.parse(cleanedText)

		// Проверяем, что пришло 5 вопросов
		if (!data.questions || data.questions.length !== 5) {
			console.log('⚠️ Gemini вернул не 5 вопросов, отправляем заглушки')
			const fallbackQuestions = getFallbackQuestions(batchNumber, topic)
			return NextResponse.json({ questions: fallbackQuestions })
		}

		return NextResponse.json({ questions: data.questions })
	} catch (error: any) {
		console.error('❌ Ошибка генерации пачки:', error)

		// При любой ошибке отправляем 5 вопросов-заглушек
		// batchNumber и topic уже доступны из объявленных выше переменных
		const fallbackQuestions = getFallbackQuestions(batchNumber, topic)
		return NextResponse.json({ questions: fallbackQuestions })
	}
}
