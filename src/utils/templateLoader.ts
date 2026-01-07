/**
 * Template loader utility
 * Loads template files and performs simple variable substitution
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load a template file and substitute variables
 * Variables are in the format {{VAR_NAME}}
 */
export function loadTemplate(templateName: string, variables: Record<string, string> = {}): string {
  const templatePath = join(__dirname, '..', 'templates', `${templateName}.template`);
  
  try {
    let content = readFileSync(templatePath, 'utf-8');
    
    // Simple variable substitution: {{VAR_NAME}} -> value
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      content = content.replace(regex, value);
    }
    
    return content;
  } catch (error) {
    throw new Error(
      `Failed to load template ${templateName}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
