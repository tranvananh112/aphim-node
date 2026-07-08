const fs = require('fs');
const path = require('path');

const sourceCSS = 'f:\\Wesite Xem Phim Node\\css\\floating-dock.css';
const sourceJS = 'f:\\Wesite Xem Phim Node\\js\\floating-dock.js';
const sourceHTML = 'f:\\Wesite Xem Phim Node\\views\\partials\\floating-dock.ejs';

const targetDirs = [
    'f:\\Wesite Xem Phim',
    'f:\\Wesite Xem Phim Mới'
];

let dockHtml = fs.readFileSync(sourceHTML, 'utf8');

targetDirs.forEach(dir => {
    console.log(`Processing directory: ${dir}`);
    
    // Copy CSS and JS
    fs.copyFileSync(sourceCSS, path.join(dir, 'css', 'floating-dock.css'));
    console.log(`Copied floating-dock.css to ${dir}\\css`);
    
    fs.copyFileSync(sourceJS, path.join(dir, 'js', 'floating-dock.js'));
    console.log(`Copied floating-dock.js to ${dir}\\js`);
    
    // Process HTML files
    const files = fs.readdirSync(dir);
    let count = 0;
    
    files.forEach(file => {
        if (file.endsWith('.html')) {
            const filePath = path.join(dir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            
            if (!content.includes('floating-dock-container')) {
                // Find </body>
                const bodyIndex = content.lastIndexOf('</body>');
                if (bodyIndex !== -1) {
                    content = content.substring(0, bodyIndex) + 
                              '\n' + dockHtml + '\n' + 
                              content.substring(bodyIndex);
                    fs.writeFileSync(filePath, content, 'utf8');
                    count++;
                } else {
                    // Try to append at the end if no </body> tag
                    content += '\n' + dockHtml + '\n';
                    fs.writeFileSync(filePath, content, 'utf8');
                    count++;
                }
            }
        }
    });
    console.log(`Updated ${count} HTML files in ${dir}`);
    
    // Also process html files in /profile/ directory if it exists
    const profileDir = path.join(dir, 'profile');
    if (fs.existsSync(profileDir)) {
        const profileFiles = fs.readdirSync(profileDir);
        let profileCount = 0;
        profileFiles.forEach(file => {
            if (file.endsWith('.html')) {
                const filePath = path.join(profileDir, file);
                let content = fs.readFileSync(filePath, 'utf8');
                
                if (!content.includes('floating-dock-container')) {
                    const bodyIndex = content.lastIndexOf('</body>');
                    if (bodyIndex !== -1) {
                        content = content.substring(0, bodyIndex) + 
                                  '\n' + dockHtml + '\n' + 
                                  content.substring(bodyIndex);
                        fs.writeFileSync(filePath, content, 'utf8');
                        profileCount++;
                    }
                }
            }
        });
        console.log(`Updated ${profileCount} HTML files in ${profileDir}`);
    }
});

console.log('Done!');
