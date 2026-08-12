const fs = require('fs');
let code = fs.readFileSync('F:/Wesite Xem Phim Node/public/js/api.js', 'utf8');
code = code.replace(/class MovieAPI \{[\s\S]*\}\s*const movieAPI = new MovieAPI\(\);/, 'class MovieAPI {' + code.match(/class MovieAPI \{([\s\S]*)\}\s*const movieAPI = new MovieAPI\(\);/)[1] + '}\nmodule.exports = new MovieAPI();');
fs.writeFileSync('F:/Wesite Xem Phim Node/api_test.js', code);
