const fs = require('fs');

const logPath = 'verify_all_output_v2.txt';

try {
    const buffer = fs.readFileSync(logPath);
    let content = '';
    
    // Check for UTF-16LE BOM
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        content = buffer.toString('utf16le');
    } else {
        content = buffer.toString('utf8');
    }

    const lines = content.split(/\r?\n/);
    let passed = 0;
    let failed = 0;

    let output = '--- Failures ---\n';
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes(': Passed')) {
            passed++;
        } else if (line.includes(': Failed')) {
            failed++;
            const cleanLine = line.replace(/[^\x20-\x7E]/g, ''); 
            output += cleanLine + '\n';
            
            for (let j = 1; j < 10; j++) {
                if (i + j < lines.length) {
                    const nextLine = lines[i+j].trim();
                    if (nextLine.includes('Error:')) {
                        output += '  ' + nextLine.replace(/[^\x20-\x7E]/g, '') + '\n';
                    }
                }
            }
        }
    }
    output += '----------------\n';
    output += `Passed: ${passed}\n`;
    output += `Failed: ${failed}\n`;

    fs.writeFileSync('failures_clean.txt', output);
    console.log('Written to failures_clean.txt');

} catch (e) {
    console.error('Error:', e);
}
