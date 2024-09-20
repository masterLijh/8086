  let UI = {} ;
  UI.reset = function(){
             this.width = document.body.clientWidth ;
             this.height = window.innerHeight ;
             this.baseFont = Math.floor( this.width / 39 );
             if(this.baseFont > 22 ) this.baseFont = 22 ;
             document.body.style.fontSize = this.baseFont + 'px' ;
             document.getElementById('main').style.height = this.height * 0.6 + 'px' ;

         } ;
   UI.log = function(str){
          document.querySelector('h2#tips').textContent = str ;
         } ;
  
  UI.showForm = function(){
   this.form.style.display = 'block' ;
   this.form.style.height = "100%" ;
   //document.getElementById('main').style.backgroundImage = "none" ;
   document.querySelector('div#history').textContent = "" ;
     } ;
  UI.hideForm = function(){
     this.form.style.display = 'none' ;
     //document.getElementById('main').style.backgroundImage = "myPic.jpg" ;
       } ;
  UI.showQueryTable = function(){
     let tableDom = document.querySelector('table#queryTable') ;
       tableDom.style.display = 'block' ;
      };
  UI.hideQueryTable = function(){
      let tableDom = document.querySelector('table#queryTable') ;
          tableDom.style.display = 'none' ;
      };
  UI.clearHistory = function(){
          document.querySelector('div#history').textContent = '' ;
     };
  UI.hidePopup = function(){
           let popupDOM = document.getElementById('popup') ;
           popupDOM.onclick = function(){
            this.style.display = 'none' ;
            this.textContent = '' 
           }
      } ;

  UI.createTableDom = function(jasonArr){
        //把传来的JSON数据生成web页的表格，将是一个多场合需要使用的通用功能，
         //本例中包括查询今天的作业和历史作业，因此有必要定义其为一个函数
         let items = jasonArr ;
         
            if(items.length > 0) {
                let trs = document.querySelectorAll('tr.show');
                if(trs){
                    trs.forEach(e => e.remove() );
                   }
                 let t = new Date(items[0]['time']) ;
                  document.querySelector('td#dataDate').textContent =  t.getFullYear() + '年' +  (t.getMonth() + 1 ) + '月' + t.getDate()+ '日' + '作业';   
                items.forEach((info,i) => {
                  let tr = document.createElement('tr');
                      tr.className = 'show' ;
                
                  let sn = document.createElement('td');
                      sn.textContent = i ;
                  let xm =  document.createElement('td');
                      xm.textContent = ` ${info.xm} (第${info.version}版)` ;
                  let bt = document.createElement('td');
                         if(info.project){ 
                          let url = document.createElement('a') ;
                          url.href = info.project ;
                          url.target = '_BLANK' ;
                          url.appendChild(document.createTextNode(info.bt)) ;
                          url.style.color = "#FFF" ;url.style.padding = "0.5em 1em" ;url.style.textDecoration = "none" ;
                          bt.style.backgroundColor = "#009" ;
                          bt.appendChild(url) ;
                        }else{
                          bt.textContent = info.bt ;
                      }
                  let time = document.createElement('td');
                      let t =new Date(info.time) ;
                      time.textContent = t.getHours()+ '时' + t.getMinutes()+ '分'  ;
                 
                  let yw = document.createElement('td');
                      yw.className = 'yuanwen' ;
                      yw.textContent = '共：' + info.yw.length + '字符 ' ;
                      
                      yw.onclick = () => {
                         document.getElementById('popup').style.display = 'block' ;
                         formatText(document.getElementById('popup') ,info.yw  + '\n 点击可关闭此弹窗！') ;
                         document.getElementById('popup').style.top = window.scrollY + 'px';
                        } ;
                  let dm = document.createElement('td');
                      dm.className = 'daima' ;
                      dm.textContent = '共：' + info.dm.length  + '字符' ; 
                      dm.onclick = () => {
                        //console.log(info.dm) ;
                         document.getElementById('popup').style.display = 'block' ;
                         formatText(document.getElementById('popup') ,info.dm  + '\n 点击可关闭此弹窗！') ;
                         document.getElementById('popup').style.top = window.scrollY + 'px';
                        } ;
                      
                  let check = document.createElement('td');
                      check.textContent = info.check ;
                      check.className = "check" ;  
                  tr.appendChild(sn);    tr.appendChild(xm);  
                  tr.appendChild(bt);   tr.appendChild(time);  tr.appendChild(yw); 
                  tr.appendChild(dm); tr.appendChild(check); 
                  document.querySelector('table').appendChild(tr) ;   
                }) ;
               } //数据的数组有效
                else{
                  console.log("传给createTableDom的txt文本，没有成功解析为数组数据") ;
                }  
        //---createTableDom的内部函数formatText，用于为父元素dadDom添加子元素，子元素保持文本的排版格式
          function formatText(dadDom, txt){
           dadDom.textContent = '' ;
           let pDoms = txt.split('\n');
            for(let p of pDoms){
             let pdom = document.createElement('div');
              for(let letter = 0 ; letter < p.length ; letter++){
                 let letterDom = document.createElement('span');
                 let theLetter = p[letter] ;
                 if(theLetter==' '|| theLetter=='\t'){
                   if(theLetter==' ') letterDom.textContent = '-' ;
                   if( theLetter=='\t') letterDom.textContent = '--' ;
                   letterDom.className = 'whiteSpace' ;
                 }else{
                   letterDom.textContent = theLetter ;
                 }
                 
                 pdom.appendChild(letterDom);
               }
             dadDom.appendChild(pdom) ;
            }
          }//end of formatText 
     }; //end of UI.createTableDom
      