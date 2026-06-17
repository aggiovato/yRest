import type { ERData } from "./about.diagram.js";

// Identity tag that signals "this template literal contains JavaScript".
// Zero runtime cost (delegates to String.raw); the name enables syntax
// highlighting in editors with JS-in-template-literal support.

export function erDiagramSection(data: ERData): string {
  if (!data.entities.length) return "";
  const json = JSON.stringify(data);

  return /*html*/ `
  <h2>Data Model</h2>

  <div class="card" style="padding:0;overflow:hidden;position:relative;">
    <canvas id="er-canvas" style="width:100%;display:block;cursor:grab;"></canvas>
    <div style="position:absolute;top:10px;right:14px;display:flex;gap:6px;align-items:center;">
      <select id="er-scale" title="Download quality" style="background:#161b22;border:1px solid #30363d;color:#7d8590;padding:3px 6px;border-radius:6px;font-size:11px;cursor:pointer;">
        <option value="1">1×</option>
        <option value="2">2×</option>
        <option value="3" selected>3×</option>
        <option value="4">4×</option>
      </select>
      <button id="er-dl" title="Download PNG" style="background:#161b22;border:1px solid #30363d;color:#7d8590;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;line-height:1.4;">↓ PNG</button>
    </div>
  </div>

  <script>${
    /*js*/ `
    (function(){

    var D=${json};

    // ── Constants ─────────────────────────────────────────────────────────────────
    var NW=178,HH=34,FH=22,FP=10,ROW_GAP=44,COL_GAP=100,BR=12,BO=16,LGH=84,MIN_GAP=10;

    var C={bg:'#0d1117',nb:'#161b22',nh:'#1c2128',pb:'#0d1117',ph:'#161b22',
      bo:'#30363d',bs:'#58a6ff',tx:'#e6edf3',mu:'#7d8590',
      pk:'#e3b341',fk:'#79c0ff',m2o:'#58a6ff',o2o:'#34d399',m2m:'#818cf8'};

    // ── Canvas ────────────────────────────────────────────────────────────────────
    var cv = document.getElementById('er-canvas');
    var dpr = window.devicePixelRatio||1;
    var ctx = cv.getContext('2d');

    function resize(h){
      if(h)cv.style.height = h + 'px';
      var r = cv.getBoundingClientRect();
      cv.width = Math.round(r.width*dpr);
      cv.height = Math.round(r.height*dpr);
    }

    // ── Nodes & adjacency ─────────────────────────────────────────────────────────
    var nodes = D.entities.map(function(e){
      return{e:e,x:0,y:0,w:NW,h:HH+e.fields.length*FH+6};
    });

    var nIdx={};D.entities.forEach(function(e,i){nIdx[e.name]=i;});

    var adj=nodes.map(function(){return[];}); // forward
    var radj=nodes.map(function(){return[];}); // reverse

    D.relations.forEach(function(r){
      if(r.type==='many2many'&&r.through&&nIdx[r.through]!=null){
        var s=nIdx[r.source],p=nIdx[r.through],t=nIdx[r.target];
        if(s!=null&&p!=null&&s!==p){adj[s].push(p);radj[p].push(s);}
        if(t!=null&&p!=null&&t!==p){adj[t].push(p);radj[p].push(t);}
      }else{
        var s=nIdx[r.source],t=nIdx[r.target];
        if(s==null||t==null||s===t)return;
        adj[s].push(t);radj[t].push(s);
      }
    });

    // ── Dynamic node width ────────────────────────────────────────────────────────
    function computeNodeWidths(){
      nodes.forEach(function(n){
        var e=n.e;
        ctx.font='600 12px -apple-system,BlinkMacSystemFont,sans-serif';
        var hdrW=FP+ctx.measureText(e.name).width+FP;
        if(e.isPivot){
          ctx.font='9px monospace';
          hdrW+=ctx.measureText('pivot').width+FP;
        }
        var maxRow=hdrW;
        e.fields.forEach(function(f){
          var leftPad=FP+(f.pk||f.fk?16:0);
          var rightPad=(f.required&&!f.pk?14:0)+FP;
          ctx.font=(f.required&&!f.pk?'600 ':'')+'11px monospace';
          var nw=ctx.measureText(f.name).width;
          ctx.font='10px monospace';
          var tw=ctx.measureText(f.type).width;
          maxRow=Math.max(maxRow,leftPad+nw+MIN_GAP+tw+rightPad);
        });
        n.w=Math.max(NW,Math.ceil(maxRow));
      });
    }

    // ── Layered layout (simplified Sugiyama) ──────────────────────────────────────
    var groups=[];

    function median(arr){
      if(!arr.length)return 0;
      var s=[].concat(arr).sort(function(a,b){return a-b;});
      return s[Math.floor(s.length/2)];
    }

    function computeLayout(W,H){
      var layer=nodes.map(function(){return 0;});
      var inDeg=nodes.map(function(){return 0;});
      adj.forEach(function(ts){ts.forEach(function(t){inDeg[t]++;});});
      var q=[],qi=0;
      for(var i=0;i<nodes.length;i++)if(inDeg[i]===0)q.push(i);
      if(!q.length)for(var i=0;i<nodes.length;i++)q.push(i);
      while(qi<q.length){
        var u=q[qi++];
        adj[u].forEach(function(v){if(layer[v]<=layer[u]){layer[v]=layer[u]+1;q.push(v);}});
      }
      var maxL=layer.reduce(function(m,l){return Math.max(m,l);},0);
      groups=[];
      for(var l=0;l<=maxL;l++)groups.push([]);
      for(var i=0;i<nodes.length;i++)groups[layer[i]].push(i);
      for(var l=1;l<=maxL;l++){
        var pp={};groups[l-1].forEach(function(i,p){pp[i]=p;});
        groups[l].sort(function(a,b){
          return median(radj[a].map(function(x){return pp[x]!=null?pp[x]:0;}))-
                median(radj[b].map(function(x){return pp[x]!=null?pp[x]:0;}));
        });
      }
      for(var l=maxL-1;l>=0;l--){
        var np={};groups[l+1].forEach(function(i,p){np[i]=p;});
        groups[l].sort(function(a,b){
          return median(adj[a].map(function(x){return np[x]!=null?np[x]:0;}))-
                median(adj[b].map(function(x){return np[x]!=null?np[x]:0;}));
        });
      }
      var maxNW=nodes.reduce(function(m,n){return Math.max(m,n.w);},NW);
      var colW=maxNW+COL_GAP;
      var totalW=(maxL+1)*colW-COL_GAP;
      var startX=Math.max(20,(W-totalW)/2);
      for(var l=0;l<=maxL;l++){
        var g=groups[l];
        var totalH=g.reduce(function(s,i){return s+nodes[i].h;},0)+(g.length-1)*ROW_GAP;
        var y=Math.max(20,(H-totalH)/2);
        g.forEach(function(i){nodes[i].x=startX+l*colW;nodes[i].y=y;y+=nodes[i].h+ROW_GAP;});
      }
    }

    function requiredH(){
      return Math.max(340,Math.min(720,groups.reduce(function(m,g){
        return Math.max(m,g.reduce(function(s,i){return s+nodes[i].h;},0)+(g.length-1)*ROW_GAP+LGH+70);
      },300)));
    }

    // ── View ──────────────────────────────────────────────────────────────────────
    var pan={x:0,y:0},zm=1;
    var origPos=[];

    function savePos(){origPos=nodes.map(function(n){return{x:n.x,y:n.y};});}

    function fitView(W,H){
      var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
      nodes.forEach(function(n){x0=Math.min(x0,n.x);y0=Math.min(y0,n.y);x1=Math.max(x1,n.x+n.w);y1=Math.max(y1,n.y+n.h);});
      var pad=28,gW=x1-x0+pad*2,gH=y1-y0+pad*2;
      zm=Math.min(W/gW,(H-LGH)/gH,1);
      pan.x=(W-gW*zm)/2+pad*zm-x0*zm;
      pan.y=((H-LGH)-gH*zm)/2+pad*zm-y0*zm;
    }

    // ── Rendering ─────────────────────────────────────────────────────────────────
    function rr(x,y,w,h,r){
      if(ctx.roundRect){ctx.beginPath();ctx.roundRect(x,y,w,h,r);return;}
      ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);
      ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
    }

    function edgePt(n,tx,ty){
      var cx=n.x+n.w/2,cy=n.y+n.h/2,dx=tx-cx,dy=ty-cy;
      if(!dx&&!dy)return{x:cx,y:cy};
      var s=Math.min((n.w/2)/Math.abs(dx||.001),(n.h/2)/Math.abs(dy||.001));
      return{x:cx+dx*s,y:cy+dy*s};
    }

    var badges=[];

    // ── SVG cardinality badges via Path2D ────────────────────────────────────────
    // SVG orientation: LEFT side touches the node, RIGHT side connects to the line.
    // Rotation = Math.atan2(uy,ux) aligns local +x with the outward (away-from-node) direction.
    var P2D={
      '1..1':new Path2D('M75 40C75 59.33 59.33 75 40 75C20.67 75 5 59.33 5 40C5 20.67 20.67 5 40 5C59.33 5 75 20.67 75 40ZM41 26C41 24.3431 39.6569 23 38 23C36.3431 23 35 24.3431 35 26V37H26V26C26 24.3431 24.6569 23 23 23C21.3431 23 20 24.3431 20 26V37H15C13.3431 37 12 38.3431 12 40C12 41.6569 13.3431 43 15 43H20V54C20 55.6569 21.3431 57 23 57C24.6569 57 26 55.6569 26 54V43H35V54C35 55.6569 36.3431 57 38 57C39.6569 57 41 55.6569 41 54V43H66C67.6569 43 69 41.6569 69 40C69 38.3431 67.6569 37 66 37H41V26Z'),
      '1..n':new Path2D('M40 75C59.33 75 75 59.33 75 40C75 20.67 59.33 5 40 5C20.67 5 5 20.67 5 40C5 59.33 20.67 75 40 75ZM44.9862 42.9025L18.6801 58.0904C17.2452 58.9188 15.4105 58.4272 14.582 56.9923C13.7536 55.5574 14.2452 53.7227 15.6801 52.8942L32.9862 42.9025H17C15.3431 42.9025 14 41.5594 14 39.9025C14 38.2457 15.3431 36.9025 17 36.9025H32.9862L15.5981 26.5986C14.1632 25.7702 13.6716 23.9354 14.5 22.5005C15.3284 21.0656 17.1632 20.574 18.5981 21.4024L44.9862 36.9025H46V26C46 24.3431 47.3431 23 49 23C50.6569 23 52 24.3431 52 26V36.9025H68C69.6569 36.9025 71 38.2457 71 39.9025C71 41.5594 69.6569 42.9025 68 42.9025H52V53C52 54.6569 50.6569 56 49 56C47.3431 56 46 54.6569 46 53V42.9025H44.9862Z'),
      '0..1':new Path2D('M75 40C75 59.33 59.33 75 40 75C20.67 75 5 59.33 5 40C5 20.67 20.67 5 40 5C59.33 5 75 20.67 75 40ZM23 57C24.6569 57 26 55.6569 26 54V43H33.3781C34.7102 48.1757 39.4085 52 45 52C50.5915 52 55.2898 48.1757 56.6219 43H66C67.6569 43 69 41.6569 69 40C69 38.3431 67.6569 37 66 37H56.6219C55.2898 31.8243 50.5915 28 45 28C39.4085 28 34.7102 31.8243 33.3781 37H26V26C26 24.3431 24.6569 23 23 23C21.3431 23 20 24.3431 20 26V37H15C13.3431 37 12 38.3431 12 40C12 41.6569 13.3431 43 15 43H20V54C20 55.6569 21.3431 57 23 57ZM51 40C51 41.0929 50.7078 42.1175 50.1973 43C49.1599 44.7934 47.2208 46 45 46C42.7792 46 40.8401 44.7934 39.8027 43C39.2922 42.1175 39 41.0929 39 40C39 38.9071 39.2922 37.8825 39.8027 37C40.8401 35.2066 42.7792 34 45 34C47.2208 34 49.1599 35.2066 50.1973 37C50.7078 37.8825 51 38.9071 51 40Z'),
      '0..n':new Path2D('M40 75C59.33 75 75 59.33 75 40C75 20.67 59.33 5 40 5C20.67 5 5 20.67 5 40C5 59.33 20.67 75 40 75ZM17 42.9025C15.3431 42.9025 14 41.5594 14 39.9025C14 38.2457 15.3431 36.9025 17 36.9025H32.9862L15.5981 26.5986C14.1632 25.7702 13.6716 23.9354 14.5 22.5005C15.3284 21.0656 17.1632 20.574 18.5981 21.4024L45.4091 36.8818L45.4036 36.9025H45.445L45.4091 36.8818C46.7819 31.7662 51.4511 28 57 28C62.579 28 67.2687 31.8072 68.6129 36.9652C69.9758 37.2481 71 38.4557 71 39.9025C71 41.331 70.0017 42.5262 68.6647 42.8286C67.3931 48.091 62.6531 52 57 52C51.3734 52 46.6513 48.1276 45.3534 42.9025H44.9862L18.6801 58.0904C17.2452 58.9188 15.4105 58.4272 14.582 56.9923C13.7536 55.5574 14.2452 53.7227 15.6801 52.8942L32.9862 42.9025H17ZM62.1397 36.9025C61.0891 35.163 59.1804 34 57 34C54.8196 34 52.9109 35.163 51.8603 36.9025C51.3142 37.8067 51 38.8667 51 40C51 41.0529 51.2712 42.0424 51.7475 42.9025C52.7704 44.7496 54.7392 46 57 46C59.2608 46 61.2296 44.7496 62.2525 42.9025C62.7288 42.0424 63 41.0529 63 40C63 38.8667 62.6858 37.8067 62.1397 36.9025Z'),
      'n':new Path2D('M40 75C59.33 75 75 59.33 75 40C75 20.67 59.33 5 40 5C20.67 5 5 20.67 5 40C5 59.33 20.67 75 40 75ZM17 36.9025H33.0677L15.5981 26.5986C14.1632 25.7702 13.6716 23.9354 14.5 22.5005C15.3284 21.0656 17.1632 20.574 18.5981 21.4024L44.9862 36.9025H68C69.6569 36.9025 71 38.2457 71 39.9025C71 41.5594 69.6569 42.9025 68 42.9025H44.9862L18.6801 58.0904C17.2452 58.9188 15.4105 58.4272 14.582 56.9923C13.7536 55.5574 14.2452 53.7227 15.6801 52.8942L32.9862 42.9025H17C15.3431 42.9025 14 41.5594 14 39.9025C14 38.2457 15.3431 36.9025 17 36.9025Z')
    };

    function pushBadge(x,y,ux,uy,car,col){
      badges.push({x:x,y:y,ux:ux,uy:uy,car:car,col:col});
    }

    function drawBadge(b){
      var p=P2D[b.car]||P2D['n'],sc=BR/40;
      ctx.save();
      ctx.translate(b.x+b.ux*BO,b.y+b.uy*BO);
      ctx.rotate(Math.atan2(b.uy,b.ux));
      ctx.scale(sc,sc);
      ctx.translate(-40,-40);
      ctx.fillStyle=b.col;
      ctx.fill(p,'evenodd');
      ctx.restore();
    }

    function ecol(t){return t==='one2one'?C.o2o:t==='many2many'?C.m2m:C.m2o;}

    // offset: pixels to shift perpendicular to the edge direction (for parallel edges)
    function drawEdgeLine(a,b,col,dashed,label,carA,carB,off){
      var p1=edgePt(a,b.x+b.w/2,b.y+b.h/2);
      var p2=edgePt(b,a.x+a.w/2,a.y+a.h/2);
      var dx=p2.x-p1.x,dy=p2.y-p1.y,d=Math.sqrt(dx*dx+dy*dy)||1;
      var ux=dx/d,uy=dy/d;
      var px=-uy*off,py=ux*off; // perpendicular shift
      var q1x=p1.x+px,q1y=p1.y+py,q2x=p2.x+px,q2y=p2.y+py;
      ctx.strokeStyle=col+'55';ctx.lineWidth=1.5;
      ctx.setLineDash(dashed?[5,4]:[]);
      ctx.beginPath();ctx.moveTo(q1x,q1y);ctx.lineTo(q2x,q2y);ctx.stroke();
      ctx.setLineDash([]);
      pushBadge(q1x,q1y,ux,uy,carA,col);
      pushBadge(q2x,q2y,-ux,-uy,carB,col);
      if(label){
        var mx=(q1x+q2x)/2,my=(q1y+q2y)/2;
        var la=Math.atan2(uy,ux);
        if(la>Math.PI/2||la<-Math.PI/2)la+=Math.PI; // keep text readable
        var ls=off>0?11:-11; // alternate above/below for parallel edges
        ctx.save();
        ctx.translate(mx,my);
        ctx.rotate(la);
        ctx.fillStyle=C.mu;ctx.font='10px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(label,0,ls);
        ctx.restore();
      }
    }

    // canonical key for a node pair regardless of direction
    function pairKey(a,b){
      var ai=nodes.indexOf(a),bi=nodes.indexOf(b);
      return ai<bi?ai+'-'+bi:bi+'-'+ai;
    }

    function collectEdges(){
      var edges=[];
      D.relations.forEach(function(r){
        var col=ecol(r.type);
        if(r.type==='many2many'&&r.through&&nIdx[r.through]!=null){
          var sn=nodes[nIdx[r.source]],pn=nodes[nIdx[r.through]],tn=nodes[nIdx[r.target]];
          if(sn&&pn)edges.push({a:sn,b:pn,col:col,dashed:true,label:r.foreignKey||'',carA:r.fkCarDirect||'1..1',carB:r.fkCarInverse||'0..n',off:0});
          if(tn&&pn)edges.push({a:tn,b:pn,col:col,dashed:true,label:r.otherKey||'',carA:r.otherCarDirect||'1..1',carB:r.otherCarInverse||'0..n',off:0});
        }else{
          var sn=nodes[nIdx[r.source]],tn=nodes[nIdx[r.target]];
          if(sn&&tn&&sn!==tn){
            var carA=r.carInverse||(r.type!=='one2one'?'1..n':'1..1');
            var carB=r.carDirect||(r.type==='many2many'?'1..n':'1..1');
            edges.push({a:sn,b:tn,col:col,dashed:false,label:r.label,carA:carA,carB:carB,off:0});
          }
        }
      });
      // assign perpendicular offsets to parallel edges (same node pair)
      var cnt={},idx={};
      edges.forEach(function(e){var k=pairKey(e.a,e.b);cnt[k]=(cnt[k]||0)+1;});
      edges.forEach(function(e){
        var k=pairKey(e.a,e.b),n=cnt[k];
        var i=idx[k]=(idx[k]||0);
        e.off=n>1?(i-(n-1)/2)*16:0;
        idx[k]++;
      });
      return edges;
    }

    function drawNode(n){
      var x=n.x,y=n.y,w=n.w,h=n.h,e=n.e;
      var bg=e.isPivot?C.pb:C.nb,hd=e.isPivot?C.ph:C.nh;
      ctx.save();ctx.shadowColor='rgba(0,0,0,0.45)';ctx.shadowBlur=14;ctx.shadowOffsetY=4;
      ctx.fillStyle=bg;rr(x,y,w,h,7);ctx.fill();ctx.restore();
      ctx.fillStyle=bg;rr(x,y,w,h,7);ctx.fill();
      ctx.strokeStyle=n===drag?C.bs:C.bo;ctx.lineWidth=1.2;rr(x,y,w,h,7);ctx.stroke();
      ctx.fillStyle=hd;rr(x,y,w,HH,7);ctx.fill();ctx.fillRect(x,y+HH-7,w,7);
      ctx.strokeStyle=C.bo;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(x,y+HH);ctx.lineTo(x+w,y+HH);ctx.stroke();
      ctx.fillStyle=e.isPivot?C.mu:C.tx;
      ctx.font='600 12px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.fillText(e.name,x+FP,y+HH/2);
      if(e.isPivot){
        ctx.fillStyle='#3d444d';ctx.font='9px monospace';ctx.textAlign='right';
        ctx.fillText('pivot',x+w-FP,y+HH/2);
      }
      e.fields.forEach(function(f,fi){
        var fy=y+HH+fi*FH+FH/2+3;
        ctx.fillStyle=C.mu;ctx.font='10px monospace';ctx.textAlign='right';ctx.textBaseline='middle';
        ctx.fillText(f.type,x+w-FP-(f.required&&!f.pk?14:0),fy);
        if(f.pk||f.fk){
          var tag=f.pk?'PK':'FK',tc=f.pk?C.pk:C.fk;
          ctx.fillStyle=tc+'22';ctx.strokeStyle=tc+'66';ctx.lineWidth=1;
          rr(x+FP,fy-6,12,12,2);ctx.fill();ctx.stroke();
          ctx.fillStyle=tc;ctx.font='7px monospace';ctx.textAlign='center';
          ctx.fillText(tag,x+FP+6,fy+0.5);
        }
        ctx.fillStyle=f.pk?C.pk:f.fk?C.fk:C.tx;
        ctx.font=(f.required&&!f.pk?'600 ':'')+'11px monospace';
        ctx.textAlign='left';ctx.textBaseline='middle';
        ctx.fillText(f.name,x+FP+(f.pk||f.fk?16:0),fy);
        if(f.required&&!f.pk){
          ctx.fillStyle='#f85149';ctx.beginPath();
          ctx.arc(x+w-FP-6,fy,2.5,0,Math.PI*2);ctx.fill();
        }
      });
      ctx.textBaseline='alphabetic';
    }

    function drawLegend(){
      var cvW=cv.width/dpr,cvH=cv.height/dpr;
      var yL=cvH-LGH,y1=yL+13,y2=yL+35,y3=yL+62;

      ctx.fillStyle='#161b22';
      ctx.fillRect(0,yL,cvW,LGH);
      ctx.strokeStyle='#30363d';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(0,yL);ctx.lineTo(cvW,yL);ctx.stroke();

      function legendBadge(cx,cy,car,col,angle){
        var p=P2D[car]||P2D['n'],sc=8/40;
        ctx.save();
        ctx.translate(cx,cy);
        ctx.rotate(angle);
        ctx.scale(sc,sc);
        ctx.translate(-40,-40);
        ctx.fillStyle=col;
        ctx.fill(p,'evenodd');
        ctx.restore();
      }

      // Row 1: relation line types
      var types=[
        {c:C.m2o,l:'many2one',d:false},
        {c:C.o2o,l:'one2one',d:false},
        {c:C.m2m,l:'many2many',d:true}
      ];
      ctx.textAlign='left';ctx.textBaseline='middle';ctx.font='10px monospace';
      var x=14;
      types.forEach(function(it){
        ctx.strokeStyle=it.c;ctx.lineWidth=1.5;ctx.setLineDash(it.d?[4,3]:[]);
        ctx.beginPath();ctx.moveTo(x,y1);ctx.lineTo(x+14,y1);ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle=C.mu;
        ctx.fillText(it.l,x+18,y1);
        x+=18+ctx.measureText(it.l).width+22;
      });

      // Row 2: relation type examples (pair of badges + line)
      x=14;
      var pairs=[
        {carA:'1..n',carB:'1..1',col:C.m2o,l:'many2one (N:1)'},
        {carA:'1..1',carB:'1..1',col:C.o2o,l:'one2one (1:1)'},
        {carA:'1..1',carB:'0..n',col:C.m2m,l:'pivot edge (1:0..N)'}
      ];
      pairs.forEach(function(p){
        ctx.strokeStyle=p.col+'55';ctx.lineWidth=1.2;ctx.setLineDash(p.col===C.m2m?[4,3]:[]);
        ctx.beginPath();ctx.moveTo(x+8,y2);ctx.lineTo(x+56,y2);ctx.stroke();
        ctx.setLineDash([]);
        legendBadge(x+8,y2,p.carA,p.col,0);
        legendBadge(x+56,y2,p.carB,p.col,Math.PI);
        ctx.fillStyle=C.mu;ctx.font='10px monospace';ctx.textAlign='left';ctx.textBaseline='middle';
        ctx.fillText(p.l,x+66,y2);
        x+=66+ctx.measureText(p.l).width+24;
      });

      // Row 3: individual symbol meanings
      var symbols=[
        {car:'1..1',l:'exactly one'},
        {car:'0..1',l:'zero or one'},
        {car:'1..n',l:'one or more'},
        {car:'0..n',l:'zero or more'},
        {car:'n',  l:'many (pivot)'}
      ];
      x=14;
      ctx.font='10px monospace';ctx.textAlign='left';ctx.textBaseline='middle';
      symbols.forEach(function(s){
        legendBadge(x+8,y3,s.car,C.mu,0);
        ctx.fillStyle=C.mu;
        ctx.fillText(s.l,x+20,y3);
        x+=20+ctx.measureText(s.l).width+18;
      });

      ctx.fillStyle='#3d444d';ctx.font='10px monospace';ctx.textAlign='right';ctx.textBaseline='middle';
      ctx.fillText('drag  ·  scroll to zoom  ·  dbl-click to reset',cvW-14,y1);
      ctx.textBaseline='alphabetic';
    }

    function draw(){
      var W=cv.width/dpr,H=cv.height/dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H);
      ctx.save();ctx.translate(pan.x,pan.y);ctx.scale(zm,zm);
      badges=[];
      var edges=collectEdges();
      edges.forEach(function(e){drawEdgeLine(e.a,e.b,e.col,e.dashed,e.label,e.carA,e.carB,e.off);});
      nodes.forEach(function(n){drawNode(n);});
      badges.forEach(function(b){drawBadge(b);});
      ctx.restore();
      drawLegend();
    }

    // ── Interaction ───────────────────────────────────────────────────────────────
    var drag=null,dox=0,doy=0,isPan=false,ps={x:0,y:0};

    function toW(mx,my){return{x:(mx-pan.x)/zm,y:(my-pan.y)/zm};}
    function hitTest(wx,wy){
      for(var i=nodes.length-1;i>=0;i--){var n=nodes[i];if(wx>=n.x&&wx<=n.x+n.w&&wy>=n.y&&wy<=n.y+n.h)return n;}
      return null;
    }

    cv.addEventListener('mousedown',function(ev){
      var r=cv.getBoundingClientRect(),mx=ev.clientX-r.left,my=ev.clientY-r.top;
      var w=toW(mx,my),h=hitTest(w.x,w.y);
      if(h){drag=h;dox=w.x-h.x;doy=w.y-h.y;}else{isPan=true;ps={x:mx-pan.x,y:my-pan.y};}
      cv.style.cursor='grabbing';
    });
    window.addEventListener('mousemove',function(ev){
      if(!drag&&!isPan)return;
      var r=cv.getBoundingClientRect(),mx=ev.clientX-r.left,my=ev.clientY-r.top;
      if(drag){var w=toW(mx,my);drag.x=w.x-dox;drag.y=w.y-doy;}
      else{pan.x=mx-ps.x;pan.y=my-ps.y;}
      draw();
    });
    window.addEventListener('mouseup',function(){drag=null;isPan=false;cv.style.cursor='grab';});
    cv.addEventListener('wheel',function(ev){
      ev.preventDefault();
      var r=cv.getBoundingClientRect(),mx=ev.clientX-r.left,my=ev.clientY-r.top;
      var d=ev.deltaY<0?1.1:0.91,nz=Math.max(0.25,Math.min(3,zm*d));
      pan.x=mx-(mx-pan.x)*(nz/zm);pan.y=my-(my-pan.y)*(nz/zm);zm=nz;draw();
    },{passive:false});
    cv.addEventListener('dblclick',function(){
      nodes.forEach(function(n,i){n.x=origPos[i].x;n.y=origPos[i].y;});
      var r=cv.getBoundingClientRect();fitView(r.width,r.height);draw();
    });
    window.addEventListener('resize',function(){
      resize();var r=cv.getBoundingClientRect();
      computeLayout(r.width,r.height);savePos();fitView(r.width,r.height);draw();
    });

    document.getElementById('er-dl').addEventListener('click',function(){
      var SCALE=parseInt(document.getElementById('er-scale').value,10)||3;
      var pad=36;
      var bx0=1e9,by0=1e9,bx1=-1e9,by1=-1e9;
      nodes.forEach(function(n){
        bx0=Math.min(bx0,n.x);by0=Math.min(by0,n.y);
        bx1=Math.max(bx1,n.x+n.w);by1=Math.max(by1,n.y+n.h);
      });
      var cw=bx1-bx0+pad*2,ch=by1-by0+pad*2+LGH;
      var oc=document.createElement('canvas');
      oc.width=Math.round(cw*SCALE);oc.height=Math.round(ch*SCALE);
      var sav={cv:cv,ctx:ctx,dpr:dpr,px:pan.x,py:pan.y,zm:zm};
      cv=oc;ctx=oc.getContext('2d');dpr=SCALE;
      pan.x=pad-bx0;pan.y=pad-by0;zm=1;
      draw();
      cv=sav.cv;ctx=sav.ctx;dpr=sav.dpr;pan.x=sav.px;pan.y=sav.py;zm=sav.zm;
      var a=document.createElement('a');
      a.download='er-diagram.png';a.href=oc.toDataURL('image/png');a.click();
    });

    // ── Init ──────────────────────────────────────────────────────────────────────
    requestAnimationFrame(function(){
      resize();
      computeNodeWidths();
      var r=cv.getBoundingClientRect();
      computeLayout(r.width,r.height);
      var h=requiredH();
      resize(h);r=cv.getBoundingClientRect();
      computeLayout(r.width,r.height);
      savePos();fitView(r.width,r.height);draw();
    });
    })();
      `
  }</script>`;
}
