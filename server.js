// 读入NODE内置的http服务和本地file system的模块
let http = require('http');
let fs = require('fs');

// 学生的学号和名单放入内存，可以快速响应判断客户端的请求是否由合法客户端发出
let students = [] ;
   //下面读入的students.txt文本文件为学生学号和名单，每人一行，每行以\r\n为结束（最后一行除外），学号和名单之间用\t隔开
  //下面代码把students.txt文件的文本转为数组，数组的元素为员工对象
  { 
   let list = fs.readFileSync('./students.txt').toString().split('\r\n') ;
    //用同步方式读入students.txt，确保这个文件即使较大，也能保证在客户端访问前的合法身份审核有效，注意同步函数不需要传入异步函数作为参数
    //读入fs.readFile读入的文件在内存中是单字节数组，要用toString方法转为正常字符
    //字符串再通过split方法转为数组list
     list.forEach(e => {
      let obj = {} ;
      let pos = e.indexOf('\t') ;
        obj.xh = e.slice(0,pos) ;
        obj.xm = e.slice(pos+1) ;
      students.push(obj) ;
     });
     //console.log(students) ; 
  } //读入和处理学生数据的代码块

  let teachers = [] ;
  //下面读入的teachers.txt文本文件为老师的工号和名单
  let list = fs.readFileSync('./teachers.txt').toString().split('\r\n') ;
     list.forEach(e => {
     let obj = {} ;
     let pos = e.indexOf('\t') ;
       obj.xh = e.slice(0,pos) ;
       obj.xm = e.slice(pos+1) ;
       teachers.push(obj) ;
    });
    //console.log(teachers) ; 
  
//items用于存放当日的数据，每次新的一天到来，发生文件存盘时，会把items存储到昨天的数据文件
let items = [] ; 
// cache 用于在内存变量中存放静态文件，用于快速响应客户端的GET请求，因此需要提前把相关文件读入这个对象
let cache = {}; 

let icoPath = './favicon.ico' ; // 客户端可能会主动请求Web应用的图标文件
let counter = 0 ; //记录用户提交上传数据的申请的序号，counter变量再server端每天首次接受req请求时清零
const cacheMax = 12 ; //用户提交数据上传的申请成功，每12次服务端则发生一次IO存盘
let dataHis = [] ; //data文件夹下的所有历史数据文件名，将以数组形式存在
  fs.readdir('./data' , (err,data) =>{
      if(err) throw err ;
      dataHis = data ;
  }) ;
let createDataPath = () => { //把每天的日期（yearMonthDate）作为数据存盘文件的名字
  let path = './data/' ;  //程序当前所在的data文件夹，本程序不作自动建立，需要开发者手工建立。注意：若随着时间过去，data文件夹下的文件若多了也需要手工移动到其他文件夹，避免文件太多拖慢服务
  let year = new Date().getFullYear() ;
  let month = new Date().getMonth() + 1 ;
     if(month < 10) month = '0' + month ;
  let date = new Date().getDate() ;
     if(date < 10) date = '0' + date ;
  return  path + year + month + date
} ;
 
 let dataPath = createDataPath() ;
 fs.readFile(dataPath,(err ,data) => {
       if(err) {
         console.log(' Cannot read data ，server will created datafile when need! ') ;
        }else{ //说明今天的数据文件存在，本后端服务是今天刚启动，必须读入
          items = JSON.parse(data) ; 
      //异步读入的数据data是JSON格式的文本，若不幸这个文件被破坏，可能会因这条语句造成本服务的崩溃，若发生这个问题，需要手工处理并找出数据文件被破坏的原因！（以当代的基础设施的稳定性，这个概率几乎为零）
      //counter = items[items.length -1].counter ;
         }
        });

 fs.readFile(icoPath ,(err ,data) => {
         if (err){
           console.log('Cannnot read file --"favicon.ico"  !');
         }else{
           cache[icoPath] = data ;
            }
        });
//动态读取前端的文件
   let staticFiles = [] ;
      fs.readdir('./static' ,(err,data) => {
           if(err) throw err ;
           staticFiles = data ;
           //console.log(data) ;
           //把静态文件逐一读取到cache缓存，为高速响应用户请求做准备
           staticFiles.forEach(e => { 
             let filePath = './static/' + e ;
              fs.readFile(filePath , (err,data) => {
               if(err){
                console.log(filePath + ' read error !' ) ;
                }else{
               cache[e] = data ;
                }
              }) ;//异步读取目录中的每个文件
          }) ;//结束forEach 方法
     }) ; //异步读取静态文件目录
  
             
  let server = http.createServer((req ,res) => {
     //这时要考虑一种常见情况，server运行了一天，此次写入文件是新的一天，而内存变量items已经是昨天的数据，必须写今天的文件
       let newDataPath = createDataPath() ;
       if (newDataPath !== dataPath){
           //这是每天发生的第一次写入数据文件，必须保证昨天的数据通过IO存盘
            fs.writeFile(dataPath, JSON.stringify(items), 'utf8',(err) => {
                 if(err) console.log(err) ;
               });
        //清空items内存中昨天的数据，更改数据IO的路径，记录编号清零
                    dataPath = newDataPath ;
                    counter = 0 ;
                    items = [] ;
            }
     console.log("req.url:" + req.url);

    //每次发生req请求事件，都必须对应res响应事件，req.url 是本服务域名后的地址（地址不包括端口）  
   //为避免本http服务器写的代码存在隐性问题（比如没有end事件，write事件写在end事件后），这些会造成NODE的http模块运行异常中止，我们必须对client每次请求响应做出路由设计，
  //解决问题的原则：要保证客户端的每次req都有对应的res发生，且必须尽快响应一次end事件，另外，对于任意一条路由而言，write事件要发生在end之前。
  //需要开发者亲自经历多次这样的问题，不断地解决问题，才能理解http服务的请求和响应的原理和上面的原则。
   if(req.method ==='GET') { //对于客户端的GET请求，分以下几种路由情况：
      switch ( req.url ){
        //现代浏览器向Web服务器请求URL指定的页面时，一般还会增加请求"favicon.ico"文件，作为页面的图标
         case "/favicon.ico" : console.log("client  request for favicon.ico!") ;
                              res.writeHead(200,{'Content-Type':'image/jpeg'});
                              res.end(cache[icoPath]);
                             break ;
       //static目录下的5个前端文件，逐一按系统的需要和前端的脚本设定路由
       // 设定路由 / 为客户端网页文件作为res响应   
       case "/" : console.log("client guest request for / !") ;
                    res.writeHead(200,{'Content-Type':'text/html'});
                    res.end(cache['guest.html']);
                    break ;
       // 设定路由 logo.jpg 以图像格式输出图像logo.jpg作为res响应   
       case "/logo.jpg" :  res.writeHead(200,{'Content-Type':'image/jpeg'});
                            res.end(cache['logo.jpg']);
                            break ; 
        // 设定路由 myPic.jpg 以图像格式输出图像logo.jpg作为res响应   
        case "/myPic.jpg" : res.writeHead(200,{'Content-Type':'image/jpeg'});
                            res.end(cache['myPic.jpg']);
                            break ;    
        // 设定路由 style.css 是提供样式表作为res响应   
        case "/style.css" : res.writeHead(200,{'Content-Type':'text/css'});
                            res.end(cache['style.css']);
                            break ;
        // 设定路由 clientJs.js 是提供客户端JS代码文件作为res响应   
        case "/clientJs.js" : res.writeHead(200,{'Content-Type':'text/javascript'});
                            res.end(cache['clientJs.js']);
                            break ;
        // 设定路由 cet6.txt 是提供CET6文本（5500个大学英语单词）作为res响应 
        case "/cet6.txt" :    res.writeHead(200,{'Content-Type':'text/plain'});
                         res.end(cache['cet6.txt']);
                        break ;
        //   设定路由 adminManage 把管理页文件作为res响应，由于教师管理页暂未认证身份，因此这个路由名不可泄漏              
        case "/adminManage" : console.log('client  request for admin !') ;
          res.writeHead(200,{'Content-Type':'text/html'});
          res.end(cache['admin.html']);
          break ;  
      //下面为本系统动态数据的响应                    
       // 设定路由query 为用户查询当前作业的排队的res响应          
        case "/query" :     console.log('client  request for query!') ;
                            res.writeHead(200,{'Content-Type':'text/plain'});
                            let s = JSON.stringify(items);
                            res.end(s) ;
                            break ;
                      
      //设定路由history把历史数据的日期（也即存储文件名）以数组形式中作为res响应
         case "/dataLists" : res.writeHead(200,{'content-type':'text/plain'}) ;
                            res.end(JSON.stringify(dataHis)) ;  
                            break ;
        //设定以 “history+日期” 为读取历史作业的路由
        default :  let reqUrl = req.url.slice(1) ;  
                     if(reqUrl.indexOf('history') !== -1){
                      console.log('In  history for Data File router!' ) ;
                      let fileName = reqUrl.slice('history'.length) ;
                        fs.readFile('./data/' + fileName ,(err,data) =>{
                         if(err) {
                            console.log(data + ' read error !') ;
                          }else{
                             res.writeHead(200,{'Content-Type':'text/plain'});
                            res.end(data.toString()) ; //从文件读出的信息是文件流，一种特定的单字节格式
                           }
                          }) ;
                      }else { //else 情况再无路由响应其他req请求，因此都以经典404作为res响应 。
                             console.log('client  request is unknown !') ;
                             res.writeHead(200,{'Content-Type':'text/html'});
                             res.end('<h1>Request not Found, 404 Error!</h1>' );
                            }
        } //end switch
   }  // end request GET method  
 
   if(req.method ==='POST') { //对于客户端的POST请求，分以下几种路由情况：
   
      //客户端的POST方法的路由，用if条件写，而非switch/case 写，代码表达起来更清晰
      if(req.url === '/clientPost' ) { //学生提交作业的路由

         console.log('In  clientPost router!' ) ;
         let guestBody = '' ;
         req.on('data' , chunk => {
               guestBody += chunk.toString() ;
         }) ;
         let itemGuest ;
         req.on('end' , () => {
           try{ //考虑到客户端可能传来错误的字符，JSON解析出错，导致服务器崩溃
              itemGuest = JSON.parse(guestBody) ;
               }
            catch(e){ //对所有JSON.parse无法解析的错误都传回经典的404无法响应
                  res.writeHead(200,{'Content-Type':'text/html'});
                  res.end('<h1>Request of POST not Found, 404 Error!</h1>' );
                }
              let legal = false ;
             { //增加一个判断client端发来的序号和姓名是否与students或teachers 一致的代码块
              let xh = itemGuest.xh.trim() ;
              let xm = itemGuest.xm.trim() ;
              let sf = itemGuest.sf ;
    
             if(sf == 'student'){
               students.forEach(e =>{
                   if(e.xh == xh){
                    if(e.xm == xm){
                      legal = true ;
                    }
                   }
               });
              }
              if(sf == 'teacher'){
               teachers.forEach(e =>{
                if(e.xh == xh){
                 if(e.xm == xm){
                   legal = true ;
                 }
                }
              });
             }
            }//判断是否合法上传结束
       if(!legal ){
                res.writeHead(200,{'Content-Type':'text/plain'});
                res.end('您填写的身份信息，未通过审核，没有上传!') ;
          }else{
             counter ++ ;
        //可以向items中添加申请记录了，思考：服务端需要添加哪些属性？这些属性为何不能随便让客户端发来？
             //itemGuest.counter = counter ;
             itemGuest.time = new Date() ; //客户端传来的时间可能会不一致，以服务器时间为准
             itemGuest.check = '70' ; //每次学生上传作业，系统默认给70分
             itemGuest.version  = 1 ;  //记录学生今天传了几次，定义为版本属性
             
             
            let i ;
            for( i=0 ; i<items.length; i++){ //这个循环的逻辑用于对于保证items中，每位学生（学号作为标识）只能上传一次，并记录作业的响应版本
              if ( items[i].xh == itemGuest.xh){
                   itemGuest.version +=  items[i].version  ;
                   items[i] = itemGuest ;
                  break ;
                }
               }
            if(i==items.length){ //学生当天第一次上传作业
               items.push(itemGuest);
              }
             res.writeHead(200,{'Content-Type':'text/plain'});
             if(counter % cacheMax === 0){
              fs.writeFile( dataPath , JSON.stringify(items), 'utf8' ,(err) => {
                if(err) {throw err } 
                 else{
                console.log(JSON.stringify(itemGuest) +' is saved to file!');
                res.end('您的在线作业（第' +itemGuest.version +'版）' +'，上传成功!') ;
                     }
                       });
              }else{
                res.end('您的在线作业（第' +itemGuest.version +'版）' +'已经上传!') ;
              }
         } //填报数据通过合法身份验证有效
       }); //读取用户上传数据结束
     } // if 路由 clientPost结束

      if(req.url === '/adminPost' ) { //老师提交作业成绩的路由
        console.log('In  adminPost router!' ) ;
        let guestBody = '' ;
         req.on('data' , chunk => {
               guestBody += chunk.toString() ;
         }) ;
         let itemsAdmin ;
         req.on('end' , () => {
           try{ //考虑到客户端可能传来错误的字符，JSON解析出错，导致服务器崩溃
              itemsAdmin = JSON.parse(guestBody) ;
               }
            catch(e){ //对所有JSON.parse无法解析的错误都传回经典的404无法响应
                  res.writeHead(200,{'Content-Type':'text/html'});
                  res.end('<h1>Request of POST not Found, 404 Error!</h1>' );
                }
          for(let i=0;i < itemsAdmin.length; i++){ //items的建立和修改都保证了顺序不变，因此不用担心未来还有新的学生作业
           items[i].check = itemsAdmin[i].check ;
         }
         //console.log(items) ;
         fs.writeFile( dataPath , JSON.stringify(items), 'utf8' ,(err) => {
                 if(err) {
                           res.end("Server Error, submit failed! ") ;
                           throw err ;
                             }
                   res.end('您核实的分数清单，上传成功!') ;
                });
         }) ; //end of 网络数据流接收完成  
      }//end of adminPost

      if(req.url.indexOf('/adminPostHistory')!==-1){ //admin.html发来的adminHistory路由
              
        let date = req.url.slice('/adminPostHistory'.length) ;
        console.log("admin Post history : " + date) ;
        let filePath = './data/' + date  ;
        //let checks = data ;
        let guestBody = '' ;
      req.on('data' , chunk => {
               guestBody += chunk.toString() ;
       }) ;
      let itemsAdmin ;
      req.on('end' , () => {
        try{ //考虑到客户端可能传来错误的字符，JSON解析出错，导致服务器崩溃
          itemsAdmin = JSON.parse(guestBody) ;
           }
        catch(e){ //对所有JSON.parse无法解析的错误都传回经典的404无法响应
              res.writeHead(200,{'Content-Type':'text/html'});
              res.end('<h1>Request of POST not Found, 404 Error!</h1>' );
            }
        fs.readFile(filePath , (err,data) =>{ //异步读历史作业
           if(err){
             console.log(filePath + " Read Error!") ;
           }else{
             let homeWork = JSON.parse(data.toString()) ;
             for(let i=0 ;i< homeWork.length ;i++){
                //console.log(checks[i].check) ;确认客户端admin把数组准备无误传到这里
               homeWork[i].check = itemsAdmin[i].check ;
                 }
 
              fs.writeFile( filePath , JSON.stringify(homeWork), 'utf8' ,(err) => {
                if(err) {
                          res.end("Server Error, submit failed! ") ;
                          throw err ;
                            }
                  res.end('您确认的历史分数清单，上传成功!') ;
               });
             }
         }) ; //读历史作业文件结束
        }); //读网络数据流结束
      }//POST方法的adminPostHistory路由

    }// end of request POST method

 }); //End of createServer
 server.listen(8086) ;