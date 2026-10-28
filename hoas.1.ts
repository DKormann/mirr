// // Types live in .ty; srcs contains only the node's children.
// type F        = { $: "hoas", name?: string, srcs: [], hoas: (...t: Term[]) => Term }
// type Type     = { ty: Term, $: "Type", name?: string }

// type Arrow    = { ty: Term, $: "Arrow", name?: string, srcs: F[], R: F }

// type TUPLE    = { ty: Term, $: "TUPLE", name?: string, srcs: F[] }
// type CHOIC    = { ty: Term, $: "CHOIC", name?: string, srcs: Term[] }

// type tuple    = { ty: Term, $: "tuple", name?: string, srcs: Term[] }
// type choic    = { ty: Term, $: "choic", name?: string, tag: number, srcs: [Term] }

// type untup    = { ty: Term, $: "untup", name?: string, scr: Term, size: number, srcs: [F] }
// type uncho    = { ty: Term, $: "uncho", name?: string, scr: Term, srcs: F[]}

// type APP      = { ty: Term, $: "APP", name?: string, srcs: [Term, Term] }
// type SYM      = { ty: Term, $: "SYM", name?: string, n: number }

// type Term = Type | Arrow | TUPLE | CHOIC | tuple | choic | untup | uncho | APP | SYM

// const Type = {$: "Type"} as Type
// Type.ty = Type

// function raise(msg: string): never {
//   throw new Error(msg)
// }
// const seen = new Set<Term>()


// let fillTUP = (fr: (ty:Term) => SYM, fs: F[]): SYM[] => {
//   let vs: SYM[] = []
//   for (let T of fs){
//     vs.push(fr(T.hoas(...vs)))
//   }
//   return vs
// }

// function fmt(t: Term){

//   let scounter = 0
//   let fresh = (type: Term) :SYM => ({ ty: type, $: "SYM", srcs: [], n: scounter++ })

//   function go(t:Term , d:number):string{

//     if (t.$ == "Type") return 'Type'

//     if (t.$ == "Arrow") {
//       let dom = t.srcs.slice(0,-1)
//       let cod = t.srcs[dom.length]

//       let v = fillTUP(fresh, dom)
//       let bod = cod.hoas(...v)
//       return `{${v.map(x=> `${pln(x, d)} : ${pln(x.ty, d)}`).join(', ')}} -> ${pln(bod, d)}`
//     }
//     if (t.$ == "TUPLE"){
//       let vs = fillTUP(fresh, t.srcs)
//       return `{${vs.map(v => `x${v.n} : ${pln(v.ty, d)}`).join(', ')}}`
//     }

//     if (t.$ == "CHOIC"){
//       return `(${t.srcs.map(o => pln(o, d)).join(' | ')})`
//     }

//     if (t.$ == "choic"){
//       return `(#${t.tag}: ${pln(t.srcs[0], d)}) : ${pln(t.ty, d)}`
//     }

//     if (t.$ == "tuple"){
//       return `{${t.srcs.map(f => pln(f, d)).join(', ')}} : ${pln(t.ty, d)}`
//     }
//     if (t.$ == "SYM") {
//       return `x${t.n}`
//     }
//     if (t.$ == "APP"){
//       return `${pln(t.srcs[0], d)}(${pln(t.srcs[1], d)})`
//     }

//     if (t.$ == "untup"){
//       let vs: SYM[] = Array.from({length: t.size}, (_, i) => fresh(Type))
//       let bod = t.srcs[0].hoas(...vs)
//       return `({${vs.map(v => `x${v.n}`).join(', ')}} => ${pln(bod, d)})`
//     }
//     if (t.$ == "uncho"){
//       let x = fresh(Type)
//       return `${t.srcs.map((f, i)=> `#${i}(${pln(x,d)}) => ${pln(f.hoas(x), d)}`).join(" ")}`
//     }
//     console.error(t)
//     raise(`Unknown term`)
    
//   }

//   let defs:string[] = []


//   function pln(t:Term, d:number):string{
//     if (t.name){
//       if (seen.has(t)) return t.name

//       defs.push(`${t.name} = ${go(t, 0)}`)
//       seen.add(t)
//       return t.name
//     }
//     return go(t, 0)
//   }

//   let k = pln(t, 0)
//   return defs.length ? defs.join('\n') + '\n' + k : k

// }


// function show(t:synt){
//   console.log(fmt(parseToks(t)))
// }


// function whnf(t:Term): Term{
//   if (t.$ == "APP"){
//     let f = whnf(t.srcs[0])
//     if(f.$ == "uncho"){
//       let a = whnf(t.srcs[1])
//       if (a.$ == "choic"){
//         return whnf(f.srcs[a.tag].hoas(a.srcs[0]))
//       }
//     }
//     if (f.$ == "untup"){
//       let a = whnf(t.srcs[1])
//       if (a.$ == "tuple"){
//         return whnf(f.srcs[0].hoas(...a.srcs))
//       }
//     }
//   }
//   return t
// }

// function structeEQ(a: Term, b: Term){
//   if (a == b) return
//   [a,b] = [whnf(a), whnf(b)]
//   if (a.$ != b.$) raise(`Structural mismatch: ${fmt(a)} vs ${fmt(b)}`)
//   if (a.$ == "SYM") if (a!=b) raise(`Structural mismatch: ${fmt(a)} vs ${fmt(b)}`)
// }

// function check(syn: synt){

//   let t = parseToks(syn)

//   let symCounter = 0
//   function fresh(ty: Term): SYM{ return sym(symCounter++, ty)}

//   function go(t:Term){
//     let type = whnf(t.ty)
//     switch(t.$){
//       case "TUPLE":{
//         if (type.$ != "Type") raise(`Expected type for TUP, got: ${fmt(type)}`)
//         break;
//       }

//       case "tuple":{
//         if (type.$ != "TUPLE") raise(`Expected type for tuple, got: ${fmt(type)}`)
    
//         let Ts = type.srcs
//         let fields = t.srcs
//         if (Ts.length != fields.length) raise(`Expected ${Ts.length} fields for tuple, got: ${fields.length}`)
//         let checked : Term [] = []
//         for (let i = 0; i < Ts.length; i++){
//           let T = Ts[i];
//           let fl = fields[i]
//           structeEQ(fl.ty, T.hoas(...checked))
//           go(fl)
//           checked.push(fl) 
//         }
//         break
//       }
//       case "CHOIC":{
//         structeEQ(t.ty, Type)
//         structeEQ(t.srcs[0].ty ,Type)
//         go(t.srcs[0])
//         break
//       }
//       case "untup":{
//         if (type.$ != "Arrow") raise(`Expected Arrow type for untup, got: ${fmt(type)}`)
//         let domf = type.srcs.slice(0,-1)
//         let codf = type.srcs[domf.length]
//         if (domf.length != t.size) raise(`Expected ${domf.length} arguments for untup, got: ${t.size}`)
//         let vs: SYM[] = []
//         for (let i = 0; i < domf.length; i++) vs.push(fresh(domf[i].hoas(...vs)))
//         let cod = codf.hoas(...vs)
//         let bod = t.srcs[0].hoas(...vs)
//         structeEQ(bod.ty, cod)
//         break;
//       }
//       case "SYM":{
//         break
//       }
//       case "Type": break
//       case "choic":{
//         if (type.$ != "CHOIC") raise(`Expected ENU type for choic, got: ${fmt(t.ty)}`)
//         if (t.tag >= type.srcs.length) raise(`Invalid tag for choic: ${t.tag}`)
//         let FT = type.srcs[t.tag]
//         structeEQ(t.srcs[0].ty, FT)
//         go(t.srcs[0])
//         break
//       }
//       case "uncho":{
//         if (type.$ != "Arrow") raise(`Expected Arrow type for uncho, got: ${fmt(type)}`)
//         if (type.srcs.length != 2) raise(`Expected 2 arguments for uncho domain, got: ${type.srcs.length}`)
//         let [domf, codf] = type.srcs

//         let dom = domf.hoas()
//         let cod = codf.hoas(fresh(dom))

//         if (dom.$ != "CHOIC") raise(`Expected CHOIC type for uncho domain, got: ${fmt(dom)}`)

//         if (t.srcs.length != dom.srcs.length) raise(`Expected ${dom.srcs.length} arguments for uncho, got: ${t.srcs.length}`)

//         let vs = dom.srcs.map(t=> fresh(t))

//         let bods = t.srcs.map((f, i) => f.hoas(...vs))
//         bods.forEach((bod, i)=>{
//           structeEQ(bod.ty, cod)
//           go(bod)
//         })

//         break
//       }
//       case "Arrow":{
//         structeEQ(t.ty, Type)
//         break
//       }
//       case "APP":{
//         let [fn, input] = t.srcs
//         if (input.$ != "tuple") raise(`Expected tuple for APP input, got: ${fmt(input)}`)
//         let args = input.srcs

//         let F = fn.ty
//         if (F.$ != "Arrow") raise(`Expected Arrow type for function application, got: ${fmt(F)}`)
//         let ARGS = F.srcs.slice(0, -1)
//         let R  = F.srcs[ARGS.length]
//         if (ARGS.length != args.length) raise(`Expected ${ARGS.length} arguments for APP, got: ${args.length}`)
        
//         let checked: Term[] = []
//         for (let i = 0; i < ARGS.length; i++){
//           let arg = args[i]
//           structeEQ(arg.ty, ARGS[i].hoas(...checked))
//           go(arg)
//           checked.push(arg)
//         }
//         structeEQ(R.hoas(...checked), t.ty)
//         go(fn)
        
//         break
//       }
//     }
//   }

//   return go(t)
// }


// /**
//  * 
//  *  SURFACE LEVEL SYNTAX PARSING AND TESTING
//  *
//  */

// type ff = ((...x: Term[]) => synt)
// type ft = ((...x: Term[]) => typSyntax)
// type typSyntax = {CHOIC: typSyntax[]} | (typSyntax | ft)[] | {"->": (typSyntax | ft)[]} | Term | { T: typSyntax }
// type synt = typSyntax | [number, synt]// | ff
//   | synt[] | {app: [synt, synt]}// | {match: [Term, ...ff[]]} | {uncho: ff[]}

// function as(t: synt, ty: typSyntax): Term {
//   let Ty = parseType(ty)
//   let r = parseToks(t, Ty)
//   return {...r, ty: Ty}
// }


// function hoas(f: ff | Term): F {
//   return {$: "hoas", hoas: typeof f == "function" ? (...x: Term[]) => parseToks(f(...x)) : () => f, srcs: []}
// }

// function arrow(...srcs: (ft | Term)[]): Term{
//   let fs = srcs.map(x => hoas(x))
//   return { $: "Arrow", ty: Type, srcs: fs.slice(0,-1), R: fs[fs.length-1] }
// }

// function app(fn: Term, input: Term): Term {
//   let F = fn.ty
//   let X = input.ty
//   if (F.$ != "Arrow") raise(`Expected Arrow type for function application, got: ${fmt(F)}`)
//   let R = F.srcs[1].hoas(input)
//   return { $: "APP", ty: R, srcs: [fn, input] }
// }

// function sym(n: number, ty: Term) :SYM {
//   return { $: "SYM", n, ty }
// }




// function parseType(t: typSyntax): Term {

//   if (t == Type) return Type

//   if ("$" in t) return t


//   if (Array.isArray(t)){
//     if (typeof t[0] == 'number') raise(`Unexpected number array: ${JSON.stringify(t)}`)
//     return { ty: Type, $: "TUPLE", srcs: t.map(x => {
//       if (typeof x == "function") return hoas((...s) => parseType(x(...s)))
//       return hoas(() => parseType(x))
//     })}
//   }

//   if ("T" in t) return parseType(t.T)
  
//   if ("CHOIC" in t){
//     return { ty: Type, $: "CHOIC", srcs: t.CHOIC.map(x => parseType(x)) }
//   }

//   if ("->" in t){

//     let dom = t["->"].slice(0, -1)
//     let cod = t["->"][dom.length]

//     let DOMTUP = parseType( dom )
//     if (DOMTUP.$ != "TUPLE") raise(`Expected TUP type for domain of arrow, got: ${fmt(DOMTUP)}`)
//     let DOM = DOMTUP.srcs
//     let COD = hoas(typeof cod == "function" ? (...s) => parseType(cod(...s)) : () => parseType(cod))
//     return { $: "Arrow", ty: Type, srcs: DOM, R: COD }
//   }


//   raise(`Unknown ttoks: ${JSON.stringify(t)}`)
// }

// function parseToks(t: synt, ts?: typSyntax): Term{

//   if ("$" in t) return t

//   let ty = ts ? parseType(ts) : undefined



//   if (Array.isArray(t)) {
//     // if (typeof t[0] === 'number'){
//     //   if (!ty) raise(`Unexpected number array without type: ${JSON.stringify(t)}`)
//     //   return { ty, $: "choic", tag: t[0], srcs: [parseToks(t[1])] }
//     // }

//     let tms = t.map(x=> parseToks(x as typSyntax))
//     let T : TUPLE = {ty: Type, $: "TUPLE", srcs: tms.map(t =>  hoas(() => t.ty))}
//     return { ty: ty ?? T, $: "tuple", srcs: tms}

//   }

//   // if (typeof t == 'function'){ 
//   //   if (!ty) raise(`Unexpected function without type: ${t}`)
//   //   let Ty = parseType(ty)
//   //   return {
//   //     ty: Ty,
//   //     $: "untup",
//   //     size: t.length,
//   //     srcs: [hoas((...x: Term[]) => parseToks(t(...x)))]
//   //   }
//   // }

//   if ("app" in t){
//     if (!ty) raise(`Unexpected app without type: ${JSON.stringify(t)}`)
//     return { ty, $: "APP", srcs: [parseToks(t.app[0]), parseToks(t.app[1])] }
//   }


//   // if ("match" in t){

//   //   let [scrutinee, ...arms] = t.match
//   //   let SCR = parseToks(scrutinee)
//   //   let A = SCR.ty

//   //   if (A.$ != "CHOIC") raise(`Expected CHOICE type for scrutinee of match, got: ${fmt(A)}`)

//   //   let R = parseToks(arms[0]({$:"SYM", ty: A.srcs[0], n: 0, srcs:[]})).ty
//   //   let CLS = arms.map((cl):F => hoas((x:Term) => parseToks(cl(x))))

//   //   let T = parseToks({"->": [A, R]})
//   //   return { ty: ty ?? T, $: "uncho", srcs: CLS}
//   // }

//   // if ("uncho" in t){
//   //   if (!ty) raise(`Unexpected uncho without type: ${JSON.stringify(t)}`)
//   //   let [...arms] = t.uncho
//   //   if (ty.$ != "Arrow") raise(`Expected Arrow type for uncho, got: ${fmt(ty)}`)
//   //   // let CLS = arms.map((cl):F => ({ $: "hoas", hoas: (x:Term) => parseToks(cl(x)), srcs: [] } ))
//   //   let CLS = arms.map((cl):F => hoas((x:Term) => parseToks(cl(x))))
//   //   return { ty: ty, $: "uncho", srcs: CLS}

    
//   // }





//   return parseType(t )
// }


// function rejec(t:synt){
//   let term = parseToks(t)
//   try{
//     check(term)
//   }catch(e){
//     return
//   }
//   throw new Error(`Term accepted: ${fmt(term)}`)
// }



// let NULL = parseToks({T:[]})
// NULL.name = "NULL"
// let Null = parseToks([], NULL)
// Null.name = "Null"

// let BOOL = parseToks({CHOIC: [NULL, NULL]})
// BOOL.name = "BOOL"

// let TRUE = parseToks([0, Null], BOOL)
// TRUE.name = "TRUE"

// show(TRUE)


// let BB2 = parseToks([BOOL, BOOL])
// show(BB2)

// let SIG1 = parseToks({T: [Type, x=>{return x}]})

// check(SIG1)

// rejec(as(BOOL, BOOL))
// check(as(BOOL, Type))


// let sig = parseToks([BOOL, TRUE])


// check(sig)

// check(as(sig, SIG1))
// rejec(as([BOOL, Null], SIG1))
// check([BOOL, Null])
// rejec(as([NULL, TRUE], SIG1))
// check(as([NULL, Null], SIG1))


// check(as([BOOL, NULL, TRUE], [Type, Type, BOOL]))
// rejec(as([BOOL, NULL, Null], [Type, Type, BOOL]))
// check(as([BOOL, NULL, TRUE], [Type, Type, (a,b)=>a]))
// check(as([BOOL, NULL, TRUE], [Type, Type, (a,b)=>a]))
// check(as([BOOL, NULL, Null], [Type, Type, (a,b)=>b]))
// rejec(as([BOOL, NULL, Null], [Type, Type, (a,b)=>a]))


// // check(as(t=>t, {"->": [Type, Type]}))
// // check(as(t=>t, {"->": [BOOL, BOOL]}))
// // rejec(as(t=>t, {"->": [BOOL, Type]}))
// // rejec(as(t=>t, {"->": [Type, NULL]}))

// // check(as(t=>t, {"->": [NULL, NULL]}))
// // check(as((x,y) => x, {"->": [NULL, BOOL, NULL]}))
// // check(as((x,y) => y, {"->": [NULL, BOOL, BOOL]}))
// // rejec(as((x,y) => y, {"->": [NULL, BOOL, NULL]}))


// // check(as((t,x) => x, {"->": [Type, x=>x, x=>x]}))
// // rejec(as((t,x) => t, {"->": [Type, x=>x, x=>x]}))
// // rejec(as((t,x) => x, {"->": [Type, x=>x, Type]}))
// // rejec(as((t,x) => x, {"->": [Type, x=>x, (x,y)=>y]}))


// // check(as((A,B,x)=>x, {"->": [Type, Type, (x,y)=>x, (x,y)=>x]}))
// // check(as((A,B,x)=>x, {"->": [Type, Type, (x,y)=>y, (x,y)=>y]}))
// // rejec(as((A,B,x)=>x, {"->": [Type, Type, (x,y)=>x, (x,y)=>y]}))
// // check(as((A,B,x)=>A, {"->": [Type, Type, x=>x, Type]}))
// // rejec(as((A,B,x)=>A, {"->": [Type, Type, x=>x, x=>x]}))


 
// // let fst = as((x,y) => x, {"->": [BOOL, NULL, BOOL]})

// // check(fst)

// // check(as({app: [fst, [TRUE, Null]]}, BOOL))
// // rejec(as({app: [fst, [TRUE, Null]]}, NULL))


// // const WBO = parseType({CHOIC: [BOOL]})
// // check(as([0, TRUE], WBO))
// // rejec(as(NULL, BOOL))

// // rejec(as(NULL, WBO))
// // rejec(as([0, NULL], WBO))
// // rejec(as(TRUE, WBO))


// // let mtf = parseToks({match: [TRUE, ()=>Null, ()=>Null]})

// // show(mtf)
// // show(mtf.ty)


// // let mtT = parseToks({uncho: [()=> BOOL, () => NULL]}, arrow(BOOL, Type))

// // mtT.name = "mtT"

// // show(mtT)

// // check(mtT)

// // rejec(as(mtT, {"->": [NULL, Type]}))
// // rejec(as(mtT, {"->": [WBO, Type]}))
// // rejec(as(mtT, {"->": [BOOL, BOOL]}))


// // let mtP = parseToks({uncho: [()=> TRUE, ()=> Null]}, arrow(BOOL, t=> app(mtT, t)))

// // // show(mtP.ty)
// // check(mtP)




