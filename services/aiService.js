const OpenAI = require('openai');

class AIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        
        // Model configurations for different use cases
        this.models = {
            // Primary model for code completion
            codeCompletion: 'gpt-3.5-turbo',
            // Backup model
            fallback: 'gpt-3.5-turbo-instruct'
        };
        
        // Language-specific system prompts to improve completion quality
        this.languagePrompts = {
            javascript: 'You are a JavaScript autocomplete. Return only raw JavaScript code, no formatting, no numbers, no explanations. Each line should be a valid completion.',
            python: 'You are a Python autocomplete. Return only raw Python code, no formatting, no numbers, no explanations. Each line should be a valid completion.',
            java: 'You are a Java autocomplete. Return only raw Java code, no formatting, no numbers, no explanations. Each line should be a valid completion.',
            clike: 'You are a C++ autocomplete. Return only raw C++ code, no formatting, no numbers, no explanations. Each line should be a valid completion.',
            go: 'You are a Go autocomplete. Return only raw Go code, no formatting, no numbers, no explanations. Each line should be a valid completion.',
            rust: 'You are a Rust autocomplete. Return only raw Rust code, no formatting, no numbers, no explanations. Each line should be a valid completion.',
            php: 'You are a PHP autocomplete. Return only raw PHP code, no formatting, no numbers, no explanations. Each line should be a valid completion.',
            ruby: 'You are a Ruby autocomplete. Return only raw Ruby code, no formatting, no numbers, no explanations. Each line should be a valid completion.',
            default: 'You are a code autocomplete. Return only raw code, no formatting, no numbers, no explanations. Each line should be a valid completion.'
        };
    }

    /**
     * Get AI-powered code completions using OpenAI
     * @param {string} code - Current code content
     * @param {string} language - Programming language
     * @param {object} cursor - Cursor position {line, ch}
     * @param {number} maxSuggestions - Maximum number of suggestions to return
     * @returns {Promise<Array>} Array of completion suggestions
     */
    async getCodeCompletions(code, language, cursor, maxSuggestions = 3) {
        try {
            console.log('OpenAI Completion requested for language:', language);
            
            // Prepare context for OpenAI
            const context = this.prepareContext(code, language, cursor);
            
            // Get completions from OpenAI
            const suggestions = await this.generateCompletions(context, language, maxSuggestions);
            
            // Process and filter suggestions
            return this.processSuggestions(suggestions, code, cursor);
            
        } catch (error) {
            console.error('OpenAI Service Error:', error);
            // Return basic completions when AI fails
            return this.getBasicCompletions(code, cursor);
        }
    }

    /**
     * Prepare code context for OpenAI
     */
    prepareContext(code, language, cursor) {
        const lines = code.split('\n');
        const currentLine = lines[cursor.line] || '';
        
        // Get context before cursor (last 10 lines for better context)
        const contextStart = Math.max(0, cursor.line - 10);
        const beforeLines = lines.slice(contextStart, cursor.line);
        
        // Get the text before cursor on current line
        const beforeCursor = currentLine.substring(0, cursor.ch);
        
        // Create context that shows exactly where the cursor is
        const contextWithCursor = [
            ...beforeLines,
            beforeCursor + '|CURSOR|' // Mark cursor position clearly
        ].join('\n');
        
        return {
            fullContext: contextWithCursor,
            currentLine: currentLine,
            beforeCursor: beforeCursor,
            cursorPosition: cursor.ch,
            language: language
        };
    }

    /**
     * Generate completions using OpenAI API
     */
    async generateCompletions(context, language, maxSuggestions) {
        try {
            // Prepare the prompt for OpenAI
            const systemPrompt = this.languagePrompts[language] || this.languagePrompts.default;
            
                        const userPrompt = `Complete this ${language} code. The |CURSOR| shows where to continue. Return only the text that should be inserted at the cursor position:\n\n${context.fullContext}\n\nProvide ${maxSuggestions} completions that continue from |CURSOR|:`;

            const completion = await this.openai.chat.completions.create({
                model: this.models.codeCompletion,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                max_tokens: 100,  // Reduced for shorter, cleaner responses
                temperature: 0.1, // Lower temperature for more deterministic completions
                n: 1,
                stop: ["\n\n", "```", "---"] // Stop at natural breakpoints
            });

            const response = completion.choices[0]?.message?.content || '';
            
            console.log('Raw OpenAI response:', JSON.stringify(response));
            
            // Parse the response to extract options
            const suggestions = this.parseOpenAIResponse(response);
            
            console.log('Final parsed suggestions:', suggestions);
            return suggestions;
            
        } catch (error) {
            console.error('OpenAI API Error:', error);
            
            // Try fallback model
            if (error.status !== 429 && this.models.fallback) {
                return await this.tryFallbackModel(context, maxSuggestions);
            }
            
            throw error;
        }
    }

    /**
     * Parse OpenAI response to extract clean completion options
     */
    parseOpenAIResponse(response) {
        const suggestions = [];
        const lines = response.split('\n');
        
        for (let line of lines) {
            // Remove common prefixes that AI might add
            line = line.trim();
            
            // Skip empty lines and markdown
            if (!line || line.includes('```') || line.startsWith('#')) {
                continue;
            }
            
            // Remove cursor markers if AI included them
            line = line.replace(/\|CURSOR\|/g, '');
            
            // Remove numbering and option prefixes
            line = line.replace(/^(\d+[.)\s]|OPTION\s*\d*:?\s*|[•-]\s*)/i, '');
            
            // Remove quotes around the entire suggestion if present
            if ((line.startsWith('"') && line.endsWith('"')) || 
                (line.startsWith("'") && line.endsWith("'"))) {
                line = line.slice(1, -1);
            }
            
            // Only add non-empty, meaningful suggestions
            if (line.length > 0 && !line.match(/^(here|this|example|option|cursor)/i)) {
                suggestions.push(line.trim());
            }
            
            // Limit to max suggestions
            if (suggestions.length >= 3) {
                break;
            }
        }
        
        console.log('Parsed clean suggestions:', suggestions);
        return suggestions;
    }

    /**
     * Try fallback model if primary fails
     */
    async tryFallbackModel(context, maxSuggestions) {
        try {
            console.log('Trying fallback model:', this.models.fallback);
            
            const completion = await this.openai.completions.create({
                model: this.models.fallback,
                prompt: `Complete this code:\n${context.fullContext}`,
                max_tokens: 50,
                temperature: 0.2,
                n: maxSuggestions
            });

            return completion.choices.map(choice => choice.text.trim()).filter(text => text.length > 0);
            
        } catch (fallbackError) {
            console.error('Fallback model failed:', fallbackError);
            throw fallbackError;
        }
    }

    /**
     * Process and filter AI suggestions
     */
    processSuggestions(suggestions, originalCode, cursor) {
        const processed = suggestions
            .filter(suggestion => suggestion && suggestion.trim().length > 0)
            .filter(suggestion => !originalCode.includes(suggestion)) // Remove duplicates
            .map(suggestion => ({
                text: suggestion,
                displayText: `✨ ${suggestion}`,
                className: 'ai-completion-suggestion',
                source: 'openai'
            }))
            .slice(0, 3); // Limit to 3 suggestions
        
        // If no AI suggestions, provide basic static suggestions
        if (processed.length === 0) {
            return this.getBasicCompletions(originalCode, cursor);
        }
        
        return processed;
    }

    /**
     * Provide basic code completions when AI fails
     */
    getBasicCompletions(code, cursor) {
        const lines = code.split('\n');
        const currentLine = lines[cursor.line] || '';
        const beforeCursor = currentLine.substring(0, cursor.ch).trim();
        
        console.log('Providing basic completions for:', beforeCursor);
        
        const basicSuggestions = [];
        
        // JavaScript completions
        if (beforeCursor.endsWith('console.')) {
            basicSuggestions.push('log()', 'error()', 'warn()');
        } else if (beforeCursor.includes('function') || beforeCursor.endsWith('function')) {
            basicSuggestions.push('function name() {\n    // code here\n}');
        } else if (beforeCursor.includes('const') || beforeCursor.endsWith('const')) {
            basicSuggestions.push('const variable = value;');
        } else if (beforeCursor.includes('let') || beforeCursor.endsWith('let')) {
            basicSuggestions.push('let variable = value;');
        } else if (beforeCursor.includes('if') || beforeCursor.endsWith('if')) {
            basicSuggestions.push('if (condition) {\n    // code here\n}');
        } else if (beforeCursor.includes('for') || beforeCursor.endsWith('for')) {
            basicSuggestions.push('for (let i = 0; i < array.length; i++) {\n    // code here\n}');
        } else if (beforeCursor.includes('while') || beforeCursor.endsWith('while')) {
            basicSuggestions.push('while (condition) {\n    // code here\n}');
        }
        
        // Python completions
        else if (beforeCursor.includes('def') || beforeCursor.endsWith('def')) {
            basicSuggestions.push('def function_name():\n    pass');
        } else if (beforeCursor.includes('class') || beforeCursor.endsWith('class')) {
            basicSuggestions.push('class ClassName:\n    def __init__(self):\n        pass');
        } else if (beforeCursor.includes('print') || beforeCursor.endsWith('print')) {
            basicSuggestions.push('print("")', 'print(variable)');
        }
        
        // General completions for any language
        else if (beforeCursor.length >= 2) {
            basicSuggestions.push(
                'variable = value',
                'function_name()',
                '// TODO: implement this'
            );
        }
        
        return basicSuggestions.slice(0, 3).map(suggestion => ({
            text: suggestion,
            displayText: `💡 ${suggestion}`,
            className: 'basic-completion-suggestion',
            source: 'basic'
        }));
    }

    /**
     * Check if OpenAI service is available
     */
    async isAvailable() {
        try {
            // Test with a simple completion
            const result = await this.openai.chat.completions.create({
                model: this.models.codeCompletion,
                messages: [{ role: "user", content: "Say 'test'" }],
                max_tokens: 5
            });
            return !!result;
        } catch (error) {
            console.error('OpenAI Service availability check failed:', error);
            return false;
        }
    }
}

module.exports = new AIService();