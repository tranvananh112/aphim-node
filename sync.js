const fs = require('fs');
const p='F:/Wesite Xem Phim Node/views/danh-sach.ejs';
const h=['F:/Wesite Xem Phim/danh-sach.html','F:/Wesite Xem Phim Mới/danh-sach.html'];
const c=fs.readFileSync(p,'utf8');
const s='<div id="categoriesGrid"';
const e='<!-- Loading -->';
const si=c.indexOf(s);
const ei=c.indexOf(e);
if(si!==-1&&ei!==-1){
    const b=c.substring(si,ei);
    h.forEach(x=>{
        if(fs.existsSync(x)){
            let hc=fs.readFileSync(x,'utf8');
            const hs=hc.indexOf(s);
            const he=hc.indexOf(e);
            if(hs!==-1&&he!==-1){
                fs.writeFileSync(x,hc.substring(0,hs)+b+hc.substring(he));
                console.log('Updated '+x);
            }
        }
    });
}
