const fs = require('fs');
const path = 'src/pages/HospitalDashboard.jsx';

try {
    let content = fs.readFileSync(path, 'utf8');
    let originalLength = content.length;

    // 1. Hospital Icon in Title
    // Pattern: ðŸ ¥ (resembles 🏥)
    content = content.replace(/ðŸ ¥\s*Hospital/g, '🏥 Hospital');

    // 2. Edit Icon
    // Pattern: âœ ï¸ (resembles ✏️)
    content = content.replace(/âœ ï¸/g, '✏️');

    // 3. Timer/Hourglass Icon (Temporarily Unavailable)
    // Pattern: â ¸ (resembles ⏳ or ⏰)
    content = content.replace(/â ¸/g, '⏳');

    // 4. Save Icon (Floppy)
    // Pattern: ðŸ’¾ (resembles 💾)
    content = content.replace(/ðŸ’¾/g, '💾');

    // 5. Check for any left over "Clipboard" patterns if previous steps failed
    // (Optional, based on previous diffs, these might be fixed already, but good to ensure)
    content = content.replace(/📋¢/g, '📢');
    content = content.replace(/📋¤/g, '📤');
    content = content.replace(/📋‚/g, '📂');

    // 6. Fix "Location" if not fixed
    content = content.replace(/📋\s+Location/g, '📍 Location');

    fs.writeFileSync(path, content, 'utf8');
    console.log(`Successfully processed file. Length: ${originalLength} -> ${content.length}`);

} catch (e) {
    console.error('Error fixing file:', e);
}
