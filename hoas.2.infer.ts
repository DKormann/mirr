// type F = (...t: Term[]) => Term

// type Type     = { ty: Term, $: "Type",     name?: string }
// type Arrow    = { ty: Term, $: "Arrow",    name?: string, DOM: Term, COD: F }

// type STRUCT   = { ty: Term, $: "STRUCT",   name?: string, srcs: F[] }
// type CHOICE   = { ty: Term, $: "CHOICE",   name?: string, srcs: Term[] }

// type struct   = { ty: Term, $: "struct",   name?: string, srcs: Term[] }
// type choice   = { ty: Term, $: "choice",   name?: string, tag: number, src: Term }

// type destruct = { ty: Term, $: "destruct", name?: string, scr?: Term, runner: F }
// type match    = { ty: Term, $: "match",    name?: string, scr: Term, srcs: F[]}

// type APP      = { ty: Term, $: "APP",      name?: string, fn: Term, arg:Term }
// type SYM      = { ty: Term, $: "SYM",      name?: string, n: number }

// type Term = Type | Arrow | STRUCT | CHOICE | struct | choice | destruct | match | APP | SYM

// const Type = {$: "Type"} as Type
// Type.ty = Type

// function raise(msg: string): never {
//   throw new Error(msg)
// }
// const seen = new Set<Term | F>()


// let fillStruct = (fr: (ty:Term) => SYM, fs: F[]): SYM[] => {
//   let vs: SYM[] = []
//   for (let T of fs){
//     vs.push(fr(T(...vs)))
//   }
//   return vs
// }

// function fmt(t: Term){

//   let scounter = 0
//   let fresh = (ty: Term) => sym(scounter++, ty)


//   function go(t:Term):string{

//     function gofn(f: F, args: F[]): string{
//       let s = fillStruct(fresh, args)
//       return `{${s.map(v => pln(v)).join(', ')}} => ${pln(f(...s))}`
//     }

//     if (t.$ == "Type") return 'Type'

//     if (t.$ == "Arrow") {
//       let dom = t.DOM
//       let cod = t.COD

//       let v = fresh(dom)
//       let bod = cod(v)
//       return `(${pln(v)} : ${pln(dom)}) -> ${pln(bod)}`
//     }
//     if (t.$ == "STRUCT"){
//       let vs = fillStruct(fresh, t.srcs)
//       return `{${vs.map(v => `x${v.n} : ${pln(v.ty)}`).join(', ')}}`
//     }

//     if (t.$ == "CHOICE"){
//       return `(${t.srcs.map(o => pln(o)).join(' | ')})`
//     }

//     if (t.$ == "choice"){
//       return `(#${t.tag}: ${pln(t.src)}) : ${pln(t.ty)}`
//     }

//     if (t.$ == "struct"){
//       return `{${t.srcs.map(f => pln(f)).join(', ')}}`
//     }
//     if (t.$ == "SYM") {
//       return `x${t.n}`
//     }
//     if (t.$ == "APP"){
//       return `${pln(t.fn)}(${ pln(t.arg)})`
//     }

//     if (t.$ == "destruct"){
//       let A :STRUCT = (t.scr?.ty ?? (t.ty.$ == "Arrow" ? t.ty.DOM : raise("cant infer"))) as STRUCT
//       return `(${t.scr? pln(t.scr) + ': ' : ''}${gofn(t.runner, A.srcs)})`
//     }
//     if (t.$ == "match"){
//       let x = fresh(Type)
//       return `${t.srcs.map((f, i)=> `#${i}(${pln(x)}) => ${pln(f(x))}`).join(" ")}`
//     }

//     console.error(t)
//     raise(`Unknown term`)
    
//   }

//   let defs:string[] = []


//   function pln(t:Term):string{
//     if (t.name){
//       if (seen.has(t)) return t.name

//       let k = (`${t.name} = ${go(t)}`)
//       defs.push(k)
//       seen.add(t)
//       return t.name
//     }
//     return go(t)
//   }

//   let k = pln(t)
//   return defs.length ? defs.join('\n') + '\n' + k : k

// }

// function whnf(t:Term): Term{

//   if (t.$ == "match"){
//     let scr = whnf(t.scr)
//     if (scr.$ == "choice"){
//       return(t.srcs[scr.tag](scr.src))
//     }
//   }
//   if (t.$ == "APP"){
//     let f = whnf(t.fn)
//     if (f.$ == "match"){
//       let a = whnf(t.arg)
//       if (a.$ == "choice") return whnf(f.srcs[a.tag](a.src))
//     }
//     if (f.$ == "destruct"){
//       if (f.scr != undefined) raise(`Cannot apply destruct with a non-undefined scr in this context`)
//       return whnf({...f, scr: t.arg})
//     }
//   }

//   if (t.$ == "destruct" && t.scr){
//     let scr = whnf(t.scr)
//     if (scr.$ == "struct") return whnf(t.runner(...scr.srcs))
//   }
  
//   return t
// }

// function checkEQ(a: Term, b: Term){
//   if (a == b) return
//   [a,b] = [whnf(a), whnf(b)]
//   if (a.$ != b.$) raise(`Structural mismatch: ${fmt(a)} vs ${fmt(b)}`)
//   if (a.$ == "SYM") if (a!=b) raise(`Structural mismatch: ${fmt(a)} vs ${fmt(b)}`)
//   if (a.$ == "STRUCT"){
//     let ctr = 0
//     let bs=b as STRUCT
//     let vs = fillStruct(t=>sym(ctr++, t), a.srcs)
//     a.srcs.forEach((s,i)=>{
//       checkEQ(s(...vs), bs.srcs[i](...vs))
//     })
//   }
// }

// function check(t:Term){

//   let symCounter = 0
//   function fresh(ty: Term): SYM{ return sym(symCounter++, ty)}

//   function go(t:Term){
//     let type = whnf(t.ty)
//     switch(t.$){
//       case "STRUCT":{
//         if (type.$ != "Type") raise(`Expected type for TUP, got: ${fmt(type)}`)
//         break;
//       }

//       case "struct":{
//         if (type.$ != "STRUCT") raise(`Expected type for struct, got: ${fmt(type)}`)
    
//         let Ts = type.srcs
//         let fields = t.srcs
//         if (Ts.length != fields.length) raise(`Expected ${Ts.length} fields for struct, got: ${fields.length}`)
//         let checked : Term [] = []
//         for (let i = 0; i < Ts.length; i++){
//           let T = Ts[i];
//           let fl = fields[i]
//           checkEQ(fl.ty, T(...checked))
//           go(fl)
//           checked.push(fl) 
//         }
//         break
//       }
//       case "CHOICE":{
//         checkEQ(t.ty, Type)
//         checkEQ(t.srcs[0].ty ,Type)
//         go(t.srcs[0])
//         break
//       }
//       case "destruct":{

//         let A : Term
//         let R : F

//         if (t.scr){
//           A = t.scr.ty
//           R = () => type
//         }else{
//           if (type.$ != "Arrow") raise(`Expected Arrow type for destruct, got: ${fmt(type)}`)
//           A = type.DOM
//           R = (...x) => type.COD(struct(A, ...x))
//         }
//         if (A.$ != "STRUCT") raise(`Expected STRUCT type for destruct scrutinee, got: ${fmt(A)}`)
//         let vs = fillStruct(fresh, A.srcs)
//         let ret = t.runner(...vs)
//         let EXP = R(...vs)
//         checkEQ(ret.ty, EXP)
//         check(ret)
//         break
//       }
//       case "SYM":{
//         break
//       }
//       case "Type": break
//       case "choice":{
//         if (type.$ != "CHOICE") raise(`Expected ENU type for choic, got: ${fmt(t.ty)}`)
//         if (t.tag >= type.srcs.length) raise(`Invalid tag for choic: ${t.tag}`)
//         let FT = type.srcs[t.tag]
//         checkEQ(t.src.ty, FT)
//         go(t.src)
//         break
//       }
//       case "match":{
//         let A = t.scr.ty
//         if (A.$ != "CHOICE") raise(`Expected CHOICE type for match scrutinee, got: ${fmt(A)}`)
//         check(t.scr)
//         let old = {}
//         Object.assign(old, t.scr)
//         if (t.scr.$ != "SYM") raise(`Expected SYM for match scrutinee, got: ${fmt(t.scr)}`)
//         t.srcs.forEach((f, i) =>{
//           let inner = sym(i, A.srcs[i])
//           Object.assign(t.scr, choice(A, i, inner))
//           let out = f(inner)
//           checkEQ(out.ty, type)
//           check(out)
//         })

//         Object.assign(t.scr, old)

//         break
//       }
//       case "Arrow":{
//         checkEQ(t.ty, Type)
//         break
//       }
//       case "APP":{
//         if (t.fn.ty.$ != "Arrow") raise(`Expected Arrow type for function application, got: ${fmt(t.fn.ty)}`)
//         let R = t.fn.ty.COD(t.arg)
//         checkEQ(t.fn.ty.DOM, t.arg.ty)
//         checkEQ(R, type)
//         checkEQ(t.ty, R)
//         go(t.fn)
//         go(t.arg)
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

// type ft = F | Term

// function hoas(f: ft): F {
//   return typeof f == "function" ? f : () => f
// }

// function Arrow(DOM: Term, cod: ft): Arrow{
//   return { $: "Arrow", ty: Type, DOM, COD: hoas(cod) }
// }

// function CHOICE(cases: Term[], name?:string):CHOICE{
//   return { $: "CHOICE", ty: Type, srcs: cases, name }
// }

// function STRUCT(...srcs: ft []): STRUCT{
//   return { $: "STRUCT", ty: Type, srcs: srcs.map(x => hoas(x)) }
// }

// function struct(ty: Term, ...srcs: Term[]): struct{
//   return { $: "struct", ty, srcs }
// }

// function tuple(...srcs: Term[]): struct{
//   return { $: "struct", ty: STRUCT(...srcs.map(x=>x.ty)), srcs }
// }

// function sym(n: number, ty: Term) :SYM {
//   return { $: "SYM", n, ty }
// }

// function lam( f: (...x:Term[])=>Term, dom?:Term | Term[], cod?:Term | F): destruct {
//   dom ??= STRUCT(...Array.from({length: f.length}, (_, i) => NULL))
//   if (Array.isArray(dom)) dom = STRUCT(...dom)
//   if (dom.$ != "STRUCT") raise(`Expected STRUCT type for domain, got: ${fmt(dom)}`)

//   cod ??= f(...dom.srcs.map((x, i) => sym(i, x()))).ty
//   return { $: "destruct", ty: Arrow(dom, cod), runner: hoas(f)}
// }

// function destruct(scr: Term, f: F, ty?: Term): destruct{
//   let A = scr.ty
//   if (A.$ != "STRUCT") raise(`Expected STRUCT type for destruct scrutinee, got: ${fmt(A)}`)
//   let vs = A.srcs.map((x, i) => sym(i, x()))
//   return {$: "destruct", ty: ty ?? f(...vs).ty, scr, runner: f}
// }

// function app(fn: Term, arg: Term | Term[]): APP{
//   if (Array.isArray(arg)) arg = tuple(...arg)
//   let F = fn.ty
//   if (F.$ != "Arrow") raise(`Expected Arrow type for function application, got: ${fmt(F)}`)
//   return { $: "APP", ty: F.COD(arg), fn, arg }
// }

// function choice(ty: Term, tag:number, src: Term): choice{
//   return { $: "choice", ty, tag, src }
// }

// function match(scr: Term, srcs: F[], ty?: Term): match{
//   let A = whnf(scr.ty)
//   ty ??= (A.$ == "CHOICE") ? srcs[0](sym(0, A.srcs[0])).ty : raise(`Cannot infer type for match, scrutinee is not CHOICE: ${fmt(A)}`)
//   return { $: "match", ty, scr, srcs }
// }

// function rejec(term: Term){
//   try{ check(term) }
//   catch(e){ return }
//   throw new Error(`Term accepted: ${fmt(term)}`)
// }

// function show(...t: (Term | string)[]) { console.log(t.map(x=> typeof x == "string" ? x : fmt(x)).join(" "))}

// let NULL = STRUCT()
// NULL.name = "NULL"
// let BOOL = CHOICE([NULL, NULL], "BOOL")
// let Null = struct(NULL, )
// Null.name = "Null"
// let True = choice(BOOL, 0, Null)
// True.name = "True"
// let False = choice(BOOL, 1, Null)
// False.name = "False"
// show (True)

// check(True)
// rejec({...True, ty: NULL})

// check(BOOL)
// rejec({...BOOL, ty: NULL})
// rejec({...BOOL, ty: BOOL})

// check(lam((x,y)=>x, [BOOL, NULL], BOOL))
// rejec(lam((x,y)=>x, [BOOL, NULL], NULL))
// rejec(lam((x,y)=>y, [BOOL, NULL], BOOL))


// check(app(lam(x=>x, [BOOL]), [True]))
// rejec({...app(lam(x=>x, [BOOL]), [True]), ty: NULL})

// check(app(lam((x,y)=>x, [BOOL, NULL]), [True, Null]))
// rejec({...app(lam((x,y)=>x, [BOOL, NULL]), [True, Null]), ty: NULL})
// rejec({...app(lam((x,y)=>y, [BOOL, NULL]), [True, Null]), ty: BOOL})

// let mt1 = lam(x=>match(x, [x=>x, x=>True]), [BOOL], BOOL)

// let s = sym(0, BOOL)
// let mt = match(s, [x=>False, x=>True])

// check(lam(x=>match(x, [()=>False, ()=>True]), [BOOL], BOOL))

// const BoN = CHOICE([BOOL, NULL], "BoN")
// check(lam(x=>match(x, [b=>b, n=>True]), [BoN], BOOL))
// rejec(lam(x=>match(x, [b=>b, n=>n]), [BoN], BOOL))
// rejec(lam(x=>match(x, [()=>BOOL, ()=>NULL], BOOL), [BOOL]))

// let TF = lam(x=>match(x, [()=>BOOL, () => NULL], Type), [BOOL])

// show(TF)
// show(TF.ty)
// check(TF)


// checkEQ(match(True, [x=>True, x=>False]), True)
// checkEQ(match(True, [x=>x, x=>False]), Null)
// checkEQ(match(False, [x=>True, x=>False]), False)

// let Maybe = lam(x=>CHOICE([x, NULL]), [Type])
// Maybe.name = "Maybe"
// show(Maybe)

// let MaybeBool = app(Maybe, [BOOL])
// let SomeTrue = choice(MaybeBool, 0, True)

// show(SomeTrue)

// checkEQ(destruct(tuple(True), x=>x), True)
// checkEQ(destruct(tuple(True, False), (x,y)=>y), False)
// checkEQ(app(lam(x=>x, [BOOL]), [True]), True)
// checkEQ(MaybeBool, CHOICE([BOOL, NULL]))
// checkEQ(match(SomeTrue, [x=>x, x=>False]), True)
// checkEQ(app(TF, [True]), BOOL)

// let vb = sym(0, BOOL)
// check(match(vb, [()=> True, ()=> Null], app(TF, [vb])))

// check(lam(x=>match(x,    [()=> True, ()=> Null], app(TF, [x])), [BOOL], x=> app(TF, [x])))
// rejec(lam(x=>match(x,    [()=> Null, ()=> Null], app(TF, [x])), [BOOL], x=> app(TF, [x])))
// rejec(lam(x=>match(x,    [()=> True, ()=> True], app(TF, [x])), [BOOL], x=> app(TF, [x])))
// rejec(lam(x=>match(True, [()=> True, ()=> Null], app(TF, [x])), [BOOL], x=> app(TF, [x])))
// rejec(lam(x=>match(x, [()=> True, ()=> Null], app(TF, [True])), [BOOL], x=> app(TF, [x])))
// rejec(lam(x=>match(x, [()=> True, ()=> Null], app(TF, [x])), [BOOL], x=> app(TF, [True])))


