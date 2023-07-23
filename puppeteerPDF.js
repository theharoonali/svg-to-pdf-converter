const puppeteer = require('puppeteer');
const merge = require('easy-pdf-merge');
var express = require('express');
var bodyParser = require("body-parser");
var cors = require('cors');
var app = express();
var fs = require('fs');
app.use(cors());
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json({limit: "50mb"}));
app.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));

app.post('/serverinfo',function(req,res){
    var host = server.address().address;
    var port = server.address().port;
    console.log("testing if it going to log");
    let info = 'Puppeteer app is listening at http://'+host+':'+ port
    res.send(info);
})

app.get('/getlog',function(req,res){
    const path = './nodeLog.txt'
    fs.access(path, fs.F_OK, (err) => {
        if (err) {
            res.send('no file');
            return
        }
        const content = fs.readFileSync(path);
        res.send(content);
        //file exists
    })
})

app.post('/puppeteer', function (req, res) {
    var fileName= req.body.name;
    // var pagesSvg= JSON.parse(req.body.pagesSvg);
    var txtPage = req.body.pagesSvg;
    txtPage = txtPage.replace(/\r?\n|\r/g, "");
    console.log('___');
    console.log(txtPage);

    try {
        var pagesSvg = fs.readFileSync(txtPage, 'utf8')
        pagesSvg= JSON.parse(pagesSvg);

    } catch (err) {
        console.error(err);
    }

    (async () => {
        const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        var randomNumber = Math.floor(100000 * Math.random());
        var cssb = [];
        cssb.push('<style>');
        cssb.push('body {margin:0px;}');
        cssb.push('</style>');
        var css = cssb.join('');
        fileName = fileName.split(' ').join('');
        var pdfFiles=[];
        if(pagesSvg.length == 1)
        {
            await page.setContent(css+pagesSvg[0].svg, {waitUntil: 'load'});
            var filePath =  'users/cache/' +fileName + randomNumber + ".pdf";
            try{
                await page.pdf({
                    path: filePath,
                    pageRanges:"1",
                    width: pagesSvg[0].width,
                    height: pagesSvg[0].height,
                    printBackground: true
                });
            }
            catch(e){
                res.send('Error here:',e);
            }

            res.send(filePath);
        }
        else
        {
            //start: multiple pages
            for(var i=0; i<pagesSvg.length; i++){
                await page.setContent(css+pagesSvg[i].svg, {waitUntil: 'networkidle2'});
                var pdfFilePath =  'users/cache/' + 'sample'+(i+1)+ randomNumber +'.pdf';
                pdfFiles.push(pdfFilePath);
                await page.pdf({
                    path: pdfFilePath,
                    pageRanges:"1",
                    width: pagesSvg[i].width,
                    height: pagesSvg[i].height,
                    printBackground: true
                })
            }
            var filePath =  'users/cache/' + fileName + randomNumber + ".pdf";
            merge(pdfFiles,filePath,function(err){
                if(err) {
                    return console.log(err)
                }
                console.log('Success');
                res.send(filePath);
                pdfFiles.forEach(function(filepath){
                    fs.unlink(filepath, (err) => {
                        if (err) {
                            console.error(err)
                            return
                        }
                        //sample files removed
                    })
                });
            });

            //end: multiple pages
        }
        await browser.close();
        // res.send(filePath);
        fs.unlink(txtPage, (err) => {
            if (err) {
                console.error(err)
                return
            }
            //txt file removed
        })
        // res.download(filePath);
    })();

})

app.post('/testPuppeteer', function (req, res) {
    var fileName= req.body.name;
    var width= req.body.width;
    var height= req.body.height;
    var link= req.body.link;
    var fonts= req.body.fonts;
    var html = req.body.html;
    (async () => {

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    var randomNumber = Math.floor(100000 * Math.random());

    fileName = fileName.split(' ').join('');
    var cssb = [];

    cssb.push('<style>');
    cssb.push('body {margin:0px;}');
    cssb.push(fonts);
    cssb.push('</style>');

    var css = cssb.join('');

    if(link == 'true'){
        await page.goto(html);
    }
    else
    {
        await page.setContent(css+html, {waitUntil: 'load'});
    }

    var filePath =  'users/cache/' +fileName + randomNumber + ".pdf";
    if(width != "" && width != null && width != undefined && height != "" && height != null && height != undefined){

        await page.pdf({
            path: filePath,
            pageRanges:"1",
            width: width,
            height: height,
            printBackground: true,
        });
    }
    else
    {
        await page.pdf({
        path: filePath,
        pageRanges:"1",
        printBackground: true,
        });
    }

    res.send(filePath);
    await browser.close();



})();

})

//why are you not changing the code?

var server = app.listen(8003,'127.0.0.1', function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Puppeteer app is listening at http://%s:%s', host, port);
})





