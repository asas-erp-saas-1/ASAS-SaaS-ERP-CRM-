const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // text-white -> text-gray-900 dark:text-white
    // But be careful not to replace text-white/5 etc...
    // Let's use regex that ensures it's followed by a space, quote, or backtick
    content = content.replace(/\btext-white(?=[\s"'\`])/g, 'text-gray-900 dark:text-white');

    const replacers = [
        ['bg-[#0A0A0A]', 'bg-white dark:bg-[#0A0A0A]'],
        ['bg-[#050505]', 'bg-gray-50 dark:bg-[#050505]'],
        ['bg-[#111111]', 'bg-gray-100 dark:bg-[#111111]'],
        ['bg-[#171717]', 'bg-gray-200 dark:bg-[#171717]'],
        ['bg-[#121212]', 'bg-gray-100 dark:bg-[#121212]'],
        ['text-gray-100', 'text-gray-900 dark:text-gray-100'],
        ['text-gray-300', 'text-gray-800 dark:text-gray-300'],
        ['text-gray-400', 'text-gray-600 dark:text-gray-400'],
        ['border-white/5', 'border-black/5 dark:border-white/5'],
        ['border-white/10', 'border-black/10 dark:border-white/10'],
        ['border-white/20', 'border-black/20 dark:border-white/20'],
        ['border-[#262626]', 'border-gray-200 dark:border-[#262626]'],
        ['hover:border-white/10', 'hover:border-black/10 dark:hover:border-white/10'],
        ['hover:border-white/5', 'hover:border-black/5 dark:hover:border-white/5'],
        ['hover:bg-[#171717]', 'hover:bg-gray-200 dark:hover:bg-[#171717]'],
        ['hover:bg-[#0A0A0A]', 'hover:bg-gray-100 dark:hover:bg-[#0A0A0A]'],
        ['hover:bg-white/5', 'hover:bg-black/5 dark:hover:bg-white/5'],
        ['hover:bg-white/10', 'hover:bg-black/10 dark:hover:bg-white/10'],
        ['bg-white/5', 'bg-black/5 dark:bg-white/5'],
        ['bg-white/10', 'bg-black/10 dark:bg-white/10'],
        // invert black/white text/bg for elements that use bg-white text-black in dark mode
        // wait, bg-white -> bg-gray-900 dark:bg-white ?
        // let's do a couple manual ones if needed.
    ];

    replacers.forEach(([search, replace]) => {
        content = content.split(search).join(replace);
    });

    fs.writeFileSync(file, content);
});
console.log('Theme definitions added.');
