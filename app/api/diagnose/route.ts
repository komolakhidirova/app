import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Функция для анализа подтем
function analyzeSubtopics(answers: any[]) {
	const correctTopics: string[] = []
	const errorTopics: string[] = []
	const errorsByTopic: Record<string, any[]> = {}

	answers.forEach(a => {
		if (a.isCorrect) {
			if (!correctTopics.includes(a.subtopic)) {
				correctTopics.push(a.subtopic)
			}
		} else {
			if (!errorTopics.includes(a.subtopic)) {
				errorTopics.push(a.subtopic)
			}
			if (!errorsByTopic[a.subtopic]) {
				errorsByTopic[a.subtopic] = []
			}
			errorsByTopic[a.subtopic].push({
				question: a.questionText,
				userAnswer: a.userAnswer,
				correctAnswer: a.correctAnswer,
			})
		}
	})

	return { correctTopics, errorTopics, errorsByTopic }
}

export async function POST(req: Request) {
	try {
		const { topic, answers } = await req.json()

		if (!answers || answers.length === 0) {
			return NextResponse.json({
				diagnosis: 'Нет данных для анализа. Пройдите тест сначала.',
			})
		}

		// Анализируем подтемы
		const { correctTopics, errorTopics, errorsByTopic } =
			analyzeSubtopics(answers)

		// Формируем детальную информацию об ошибках
		let errorsByTopicText = ''
		Object.entries(errorsByTopic).forEach(([topicName, errors]) => {
			errorsByTopicText += `\n### Тема: ${topicName}\n`
			errors.slice(0, 3).forEach((err, idx) => {
				errorsByTopicText += `${idx + 1}. Вопрос: "${err.question.substring(
					0,
					100
				)}"\n`
				errorsByTopicText += `   Ответ ученика: ${err.userAnswer} | Правильный: ${err.correctAnswer}\n`
			})
		})

		// Проверка API ключа
		if (!process.env.GEMINI_API_KEY) {
			let diagnosis = `📊 Результаты теста по теме "${topic}"\n\n`

			if (errorTopics.length > 0) {
				diagnosis += `⚠️ Темы, требующие внимания:\n${errorTopics
					.map(t => `• ${t}`)
					.join('\n')}\n\n`
			}
			if (correctTopics.length > 0) {
				diagnosis += `✅ Хорошо усвоенные темы:\n${correctTopics
					.map(t => `• ${t}`)
					.join('\n')}\n\n`
			}

			if (errorTopics.length > 0) {
				diagnosis += `📚 Рекомендация: Повторите тему "${errorTopics[0]}" и пройдите тест снова.`
			} else {
				diagnosis += `🎉 Отличная работа! Все темы усвоены.`
			}

			return NextResponse.json({ diagnosis })
		}

		const prompt = `Ты — эксперт по образовательной диагностике. Проанализируй результаты теста.

ТЕМА: "${topic}"

### ТЕМЫ, КОТОРЫЕ УСВОЕНЫ:
${
	correctTopics.length > 0 ? correctTopics.map(t => `- ${t}`).join('\n') : 'нет'
}

### ТЕМЫ, В КОТОРЫХ БЫЛИ ОШИБКИ:
${errorTopics.length > 0 ? errorTopics.map(t => `- ${t}`).join('\n') : 'нет'}

### ДЕТАЛИ ОШИБОК:
${errorsByTopicText || 'Ошибок нет! Отлично!'}

Напиши короткую диагностику (3-4 предложения):
1. Что ученик понял хорошо (перечисли сильные темы)
2. Над чем нужно поработать (перечисли слабые темы и конкретные ошибки)
3. Краткие рекомендации

Будь поддерживающим. Говори о темах, а не о количестве правильных ответов.`

		console.log(`🤖 Генерируем диагностику для темы "${topic}"`)

		const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
		const result = await model.generateContent(prompt)
		let diagnosis = result.response.text()

		if (!diagnosis || diagnosis.length < 30) {
			diagnosis = `📚 Анализ результатов по теме "${topic}".

${
	errorTopics.length > 0
		? `⚠️ Обратите внимание на темы: ${errorTopics.join(', ')}.`
		: '✅ Все темы усвоены хорошо!'
}

${
	correctTopics.length > 0
		? `👍 Отлично усвоены: ${correctTopics.join(', ')}.`
		: ''
}

Рекомендуем повторить сложные темы и пройти тест ещё раз.`
		}

		return NextResponse.json({ diagnosis })
	} catch (error) {
		console.error('Ошибка диагностики:', error)
		return NextResponse.json({
			diagnosis:
				'Тест завершён! Посмотрите детали ответов выше, чтобы увидеть, где были ошибки.',
		})
	}
}
