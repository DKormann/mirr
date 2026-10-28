type F = (...t: Term[]) => Term

type Type     = { ty: Term, $: "Type",     name?: string }

type Arrow    = { ty: Term, $: "Arrow",    name?: string, DOM: Term, COD: F }
type STRUCT   = { ty: Term, $: "STRUCT",   name?: string, size: number, SRC: (...t:Term[]) => Term[]}
type CHOICE   = { ty: Term, $: "CHOICE",   name?: string, srcs: Term[] }
type EQ       = { ty: Term, $: "EQ",       name?: string, L: Term, R: Term }

type struct   = { ty: Term, $: "struct",   name?: string, srcs: Term[] }
type choice   = { ty: Term, $: "choice",   name?: string, tag: number, src: Term }
type eq       = { ty: Term, $: "eq",       name?: string }

type destruct = { ty: Term, $: "destruct", name?: string, scr?: Term, runner: F }
type match    = { ty: Term, $: "match",    name?: string, scr: Term, srcs: F[] }
type RW       = { ty: Term, $: "RW",       name?: string, scr: Term, eq: Term, P: F }

type APP      = { ty: Term, $: "APP",      name?: string, fn: Term, arg:Term }
type SYM      = { ty: Term, $: "SYM",      name?: string, n: number }


type Term = Type | Arrow | STRUCT | CHOICE | struct | choice | destruct | match | APP | SYM | EQ | eq | RW

const Type = {$: "Type"} as Type
Type.ty = Type

function raise(msg: string): never {
  throw new Error(msg)
}
const seen = new Set<Term | F>()

function zip<T,S,U>(ts: T[], s: S[], f: (t: T, s: S)=>U): U[] {
  if (ts.length !== s.length) throw new Error("zip: arrays must have the same length")
  return ts.map((t, i) => f(t, s[i]))
}

let fillStruct = (sctr : {c: number}, s: STRUCT): SYM[] => {
  let vs = Array.from({length: s.size}, (_, i) => sym(sctr.c++, {} as Term))
  return zip(s.SRC(...vs), vs, (ty, v)=> Object.assign(v, {ty}))
}

function fmt(t: Term){

  let scounter = {c: 0}

  function go(t:Term ):string{

    function gofn(f: F, args: STRUCT): string{
      let s = fillStruct(scounter, args)
      return `{${s.map(v => pln(v)).join(', ')}} => ${pln(f(...s))}`
    }

    if (t.$ == "Type") return 'Type'

    if (t.$ == "Arrow") {
      let dom = t.DOM
      let cod = t.COD

      let v = sym(scounter.c++, dom)
      let bod = cod(v)
      return `(${pln(v)} : ${pln(dom)}) -> ${pln(bod)}`
    }
    if (t.$ == "STRUCT"){
      let vs = fillStruct(scounter, t)
      return `{${vs.map(v => `x${v.n} : ${pln(v.ty)}`).join(', ')}}`
    }

    if (t.$ == "CHOICE"){
      return `(${t.srcs.map(o => pln(o)).join(' | ')})`
    }

    if (t.$ == "choice"){
      return `(#${t.tag}: ${pln(t.src)}) : ${pln(t.ty)}`
    }

    if (t.$ == "struct"){
      return `{${t.srcs.map(f => pln(f)).join(', ')}}`
    }
    if (t.$ == "SYM") {
      return `x${t.n}`
    }
    if (t.$ == "APP"){
      return `${pln(t.fn)}(${ pln(t.arg)})`
    }

    if (t.$ == "destruct"){
      let A :STRUCT = (t.scr?.ty ?? (t.ty.$ == "Arrow" ? t.ty.DOM : raise("cant infer"))) as STRUCT
      return `(${t.scr? pln(t.scr) + ': ' : ''}${gofn(t.runner, A)})`
    }
    if (t.$ == "match"){
      let x = sym(scounter.c++, Type)
      return `match ${pln(t.scr)}: ${t.srcs.map((f, i)=> `#${i}(${pln(x)}) => ${pln(f(x))}`).join(" ")}`
    }

    if (t.$ == "EQ"){
      return `(${pln(t.L)} == ${pln(t.R)})`
    }

    if (t.$ == "eq"){
      return `{==}`
    }

    if (t.$ == "RW"){
      return `${pln(t.scr)} % ${pln(t.eq)}`
    }

    console.error(t)
    raise(`Unknown term`)
    
  }

  let defs:string[] = []


  function pln(t:Term):string{
    if (t.name){
      if (seen.has(t)) return t.name
      seen.add(t)
      let k = (`${t.name} = ${go(t)}`)
      defs.push(k)
      return t.name
    }
    return go(t)
  }

  let k = pln(t)
  return defs.length ? defs.join('\n') + '\n' + k : k

}

function whnf(t:Term): Term{

  if (t.$ == "match"){
    let scr = whnf(t.scr)
    if (scr.$ == "choice"){
      return(t.srcs[scr.tag](scr.src))
    }
  }
  if (t.$ == "APP"){
    let f = whnf(t.fn)
    if (f.$ == "match"){
      let a = whnf(t.arg)
      if (a.$ == "choice") return whnf(f.srcs[a.tag](a.src))
    }
    if (f.$ == "destruct"){
      if (f.scr != undefined) raise(`Cannot apply destruct with a non-undefined scr in this context`)
      return whnf({...f, scr: t.arg})
    }
  }

  if (t.$ == "destruct" && t.scr){
    let scr = whnf(t.scr)
    if (scr.$ == "struct") return whnf(t.runner(...scr.srcs))
  }
  
  return t
}

function checkEQ(a: Term, b: Term){
  if (a == b) return
  [a,b] = [whnf(a), whnf(b)]

  if (a.$ != b.$) raise(`Structural mismatch: ${fmt(a)} vs ${fmt(b)}`)
  if (a.$ == "SYM") if (a!=b) raise(`Structural mismatch: ${fmt(a)} vs ${fmt(b)}`)
  if (a.$ == "STRUCT"){
    let vs = fillStruct({c: 0}, a);
    zip((b as STRUCT).SRC(...vs), vs, (s, v)=> checkEQ(v.ty, s))
  }
  if (a.$ == "EQ"){
    b = b as EQ
    checkEQ(a.L, b.L)
    checkEQ(a.R, b.R)
  }
}

function wellFounded(A: Term, a: Term):boolean{
  if (A.$ != a.$) return false
  if (A == a) return false 
  if (A.$ == "struct" && a.$ == "struct"){
    for (let i = 0; i < A.srcs.length; i++){
      if (A.srcs[i] == a || wellFounded(A.srcs[i], a.srcs[i])) return true
    }
  }
  if (A.$ == "choice" && a.$ == "choice"){
    if (A.src == a || wellFounded(A.src, a.src)) return true
  }
  return false
}


function asTag <$ extends Term["$"]>(t: Term, tag: $) : Term & {$: $}{
  if (t.$ != tag) raise(`Expected tag ${tag}, got ${t.$}`)
  return t as Term & {$: $}
}

function check(t:Term){

  let symCounter = {c: 0}
  let seen = new Set<Term>()

  type CallStack = {
    f: Term
    arg: Term
    prev: CallStack
  } | null


  function go(t:Term, cs: CallStack, ty?:Term) :Term{
    if (ty) checkEQ(t.ty, ty)
    if (seen.has(t)) return t
    seen.add(t)
    const type = whnf(t.ty)

    switch(t.$){
      case "struct":{
        zip(t.srcs, asTag(type, "STRUCT").SRC(...t.srcs) , go)
        return t
      }
      case "destruct":{
        if (t.scr){
          go(t.runner(...fillStruct(symCounter, asTag(t.scr.ty, "STRUCT"))), type)
        }else{
          let {DOM, COD} = asTag(type, "Arrow")
          let vs = fillStruct(symCounter, asTag(DOM, "STRUCT"))
          go(t.runner(...vs), COD(...vs))
        }
        return t
      }
      case "choice":{
        let srcs = asTag(type, "CHOICE").srcs
        if (t.tag >= srcs.length) raise(`Invalid tag for choic: ${t.tag}`)
        go(t.src, srcs[t.tag])
        return t
      }
      case "match":{
        let A = asTag(t.scr.ty, "CHOICE")
        asTag(t.scr, "SYM")
        let old = {...t.scr}
        t.srcs.forEach((f, i) => go(f(Object.assign(t.scr, choice(A, i, sym(i, A.srcs[i]))).src) ,type))
        Object.assign(t.scr, old)
        return t
      }
      case "EQ":case "CHOICE":case "STRUCT":case "Type":case "Arrow":{
        asTag(type, "Type")
        return t
      }
      case "APP":{
        let aro = asTag(t.fn.ty, "Arrow")
        checkEQ(type, aro.COD(t.arg))
        go(t.fn)
        go(t.arg, aro.DOM)
        return t
      }
      case "eq":{
        let ty = asTag(type, "EQ")
        checkEQ(ty.L, ty.R)
        return t
      }
      case "RW":{
        let et = asTag(t.eq.ty, "EQ")
        checkEQ(t.P(et.R), type)
        go(t.scr, t.P(et.L))
        go(t.eq)
        return t
      }
    }
    return t
  }

  go(t)

}

/**
 * 
 *  SURFACE LEVEL SYNTAX PARSING AND TESTING
 *
 */

type ft = F | Term

function hoas(f: ft): F {
  return typeof f == "function" ? f : () => f
}

function Arrow(DOM: Term, cod: ft): Arrow{
  return { $: "Arrow", ty: Type, DOM, COD: hoas(cod) }
}

function CHOICE(cases: Term[], name?:string):CHOICE{
  return { $: "CHOICE", ty: Type, srcs: cases, name }
}

function STRUCT(SRC: (...t:Term[])=> Term[], size?: number): STRUCT{
  return { $: "STRUCT", ty: Type, size: size ?? SRC.length, SRC }
}

function struct(ty: Term, ...srcs: Term[]): struct{
  return { $: "struct", ty, srcs }
}

function TUPLE(...srcs: Term[]): STRUCT{
  return STRUCT(()=> srcs, srcs.length)
}

function tuple(...srcs: Term[]): struct{
  return { $: "struct", ty: TUPLE(...srcs.map(x=>x.ty)), srcs }
}

function sym(n: number, ty: Term) :SYM {
  return { $: "SYM", n, ty }
}

function lam( f: (...x:Term[])=>Term, dom:STRUCT | Term[], cod?:Term | F): destruct  & {ty: Arrow}{

  if (Array.isArray(dom)) dom = TUPLE(...dom)
  if (dom.$ != "STRUCT") raise(`Expected STRUCT type for domain, got: ${fmt(dom)}`)
  cod ??= f(...fillStruct({c: 0}, dom)).ty
  return { $: "destruct", ty: Arrow(dom, cod), runner: hoas(f), name: f.name}
}

function destruct(scr: Term, f: F, ty?: Term): destruct{
  let A =asTag( scr.ty, "STRUCT")
  let vs = fillStruct({c: 0}, A)
  return {$: "destruct", ty: ty ?? f(...vs).ty, scr, runner: f}
}

function app(fn: Term, arg: Term | Term[]): APP{
  if (Array.isArray(arg)) arg = tuple(...arg)
  let F = fn.ty
  if (F.$ != "Arrow") raise(`Expected Arrow type for function application, got: ${fmt(F)}`)
  return { $: "APP", ty: F.COD(arg), fn, arg }
}

function choice(ty: Term, tag:number, src: Term): choice{
  return { $: "choice", ty, tag, src }
}

function match(scr: Term, srcs: F[], ty?: Term): match{
  let A = whnf(scr.ty)
  ty ??= (A.$ == "CHOICE") ? srcs[0](sym(0, A.srcs[0])).ty : raise(`Cannot infer type for match, scrutinee is not CHOICE: ${fmt(A)}`)
  return { $: "match", ty, scr, srcs }
}

function EQ(L: Term, R: Term, ty?: Term): EQ{
  return { $: "EQ", ty: ty ?? Type, L, R }
}

function eq(src: Term): eq{
  return { $: "eq", ty: EQ(src, src)}
}

function RW(scr: Term, eq: Term, P: F): RW{
  if (eq.ty.$ != "EQ") raise("expected equality")
  let ty = P(eq.ty.R)
  return { $: "RW", ty, scr, eq, P }
}

function rejec(term: Term){
  try{ check(term) }
  catch(e){ return }
  throw new Error(`Term accepted: ${fmt(term)}`)
}

function show(...t: (Term | string)[]) { console.log(t.map(x=> typeof x == "string" ? x : fmt(x)).join(" "))}

let NULL = TUPLE()
NULL.name = "NULL"
let BOOL = CHOICE([NULL, NULL], "BOOL")
let Null = struct(NULL, )
Null.name = "Null"
let True = choice(BOOL, 0, Null)
True.name = "True"
let False = choice(BOOL, 1, Null)
False.name = "False"
show (True)

check(True)
rejec({...True, ty: NULL})

check(BOOL)
rejec({...BOOL, ty: NULL})
rejec({...BOOL, ty: BOOL})



rejec(lam((x,y)=>x, [BOOL, NULL], NULL))
rejec(lam((x,y)=>y, [BOOL, NULL], BOOL))


check(app(lam(x=>x, [BOOL]), [True]))
rejec({...app(lam(x=>x, [BOOL]), [True]), ty: NULL})

check(app(lam((x,y)=>x, [BOOL, NULL]), [True, Null]))
rejec({...app(lam((x,y)=>x, [BOOL, NULL]), [True, Null]), ty: NULL})
rejec({...app(lam((x,y)=>y, [BOOL, NULL]), [True, Null]), ty: BOOL})

let mt1 = lam(x=>match(x, [x=>x, x=>True]), [BOOL], BOOL)

let s = sym(0, BOOL)
let mt = match(s, [x=>False, x=>True])

check(lam(x=>match(x, [()=>False, ()=>True]), [BOOL], BOOL))

const BoN = CHOICE([BOOL, NULL], "BoN")
check(lam(x=>match(x, [b=>b, n=>True]), [BoN], BOOL))
rejec(lam(x=>match(x, [b=>b, n=>n]), [BoN], BOOL))
rejec(lam(x=>match(x, [()=>BOOL, ()=>NULL], BOOL), [BOOL]))

let TF = lam(x=>match(x, [()=>BOOL, () => NULL], Type), [BOOL])

show(TF)
show(TF.ty)
check(TF)



check(struct(STRUCT(()=> [BOOL]), True))
rejec(struct(STRUCT(()=> [BOOL]), Null))


check(struct(TUPLE(BOOL), True))
rejec(struct(TUPLE(BOOL), Null))


let SIG = STRUCT((x, y)=>[BOOL, match(x,[()=> BOOL, ()=> NULL])])
check(struct(SIG, True, True))
rejec(struct(SIG, True, Null))
rejec(struct(SIG, False, True))
check(struct(SIG, False, Null))

checkEQ(match(True, [x=>True, x=>False]), True)
checkEQ(match(True, [x=>x, x=>False]), Null)
checkEQ(match(False, [x=>True, x=>False]), False)

let Maybe = lam(x=>CHOICE([x, NULL]), [Type])
Maybe.name = "Maybe"
show(Maybe)

let MaybeBool = app(Maybe, [BOOL])
let SomeTrue = choice(MaybeBool, 0, True)

show(SomeTrue)

checkEQ(destruct(tuple(True), x=>x), True)
checkEQ(destruct(tuple(True, False), (x,y)=>y), False)
checkEQ(app(lam(x=>x, [BOOL]), [True]), True)
checkEQ(MaybeBool, CHOICE([BOOL, NULL]))
checkEQ(match(SomeTrue, [x=>x, x=>False]), True)
checkEQ(app(TF, [True]), BOOL)

let vb = sym(0, BOOL)
check(match(vb, [()=> True, ()=> Null], app(TF, [vb])))

check(lam(x=>match(x,    [()=> True, ()=> Null], app(TF, [x])), [BOOL], x=> app(TF, [x])))
rejec(lam(x=>match(x,    [()=> Null, ()=> Null], app(TF, [x])), [BOOL], x=> app(TF, [x])))
rejec(lam(x=>match(x,    [()=> True, ()=> True], app(TF, [x])), [BOOL], x=> app(TF, [x])))
rejec(lam(x=>match(True, [()=> True, ()=> Null], app(TF, [x])), [BOOL], x=> app(TF, [x])))
rejec(lam(x=>match(x, [()=> True, ()=> Null], app(TF, [True])), [BOOL], x=> app(TF, [x])))
rejec(lam(x=>match(x, [()=> True, ()=> Null], app(TF, [x])), [BOOL], x=> app(TF, [True])))

check(EQ(True, True))

check(lam(
  (a,b,c)=>lam(
    (h1,h2)=> RW(h1, h2, x=> EQ(a,x)),
    [EQ(a,b), EQ(b,c)],
    EQ(a,c)
  ), [BOOL, BOOL, BOOL]
))

show(lam(
  (a,b,c)=>lam(
    (h1,h2)=> RW(h1, h2, x=> EQ(a,x)),
    [EQ(a,b), EQ(b,c)],
    EQ(a,c)
  ), [BOOL, BOOL, BOOL]
))


show(lam(
  (a,b,c)=>lam(
    (h1,h2)=> RW(h1, h2, x=> EQ(a,x)),
    [EQ(a,b), EQ(b,c)],
    EQ(a,c)
  ),
  [BOOL, BOOL, BOOL ]
).ty)


rejec(lam(
  (a,b,c)=>lam(
    (h1,h2)=> RW(h1, h2, x=> EQ(a,x) ),
    [EQ(a,b), EQ(b,c)],
    EQ(a,b)
  ),
  [BOOL, BOOL, BOOL]
))

rejec(lam(
  (a,b,c)=>lam(
    (h1,h2)=> RW(h1, h2, x=> EQ(a,x)),
    [EQ(a,b), EQ(a,c)],
    EQ(a,c)
  ), [BOOL, BOOL, BOOL]
))

let Nat = {} as CHOICE
Object.assign(Nat, CHOICE([Nat, Null], "Nat"))

show(Nat)

check(Nat)


let recf = {} as destruct
Object.assign(recf, lam( x=> app(recf, [x]), [Nat], Nat))
recf.name = "recf"

// rejec(recf)
