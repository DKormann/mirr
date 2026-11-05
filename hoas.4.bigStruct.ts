// export type F        = ((...t: Term[]) => Term)

export type F        = {names?: string[], length: number, f: (...t: Term[]) => Term}
export type Sign     = {names?: string[], length: number, f: (...t: Term[]) => Term[]}
export type Type     = { ty: Term, $: "Type",     }
export type Arrow    = { ty: Term, $: "Arrow",     DOM: Sign, COD: F }
export type ADT      = { ty: Term, $: "ADT",       variants:  Sign[]}
export type adt      = { ty: Term, $: "adt",       tag: number, srcs: Term[] }
export type match    = { ty: Term, $: "match",     scr: Term, srcs: F[] }
export type APP      = { ty: Term, $: "APP",       fn: Term, args: Term[] }
export type Lam      = { ty: Term, $: "Lam",       name: string, fn: F}
export type SYM      = { ty: Term, $: "SYM",       n: number | string }
export type Term = Type | Arrow | ADT | adt | match | APP | Lam | SYM


export let Hole = {} as Term

export const Type : Term = {$: "Type" ,ty: Hole}
Type.ty = Type


export function raise(msg: string): never {
  throw new Error(msg)
}

function zip<T,S,U>(ts: T[], s: S[], f: (t: T, s: S, i: number)=>U): U[] {
  if (ts.length !== s.length) throw new Error(`zip: arrays must have the same length, got ${ts.length} and ${s.length}`)
  return ts.map((t, i) => f(t, s[i], i))
}



let symlist = (ctr: {c:number} , n: number, ty? :Term) => Array.from({length: n}, (_, i) => sym(ctr.c++, ty ?? Hole))


let fillSign = (sctr : {c: number}, s: Sign): SYM[] => {
  let vs = symlist(sctr, s.length)

  if (s.names) zip(vs.slice(0, s.names.length), s.names, (v, n) => v.n = n || v.n)
  if (typeof s == "function") zip(vs, argnames(s as any), (v, n)=> v.n = n || v.n)
  let tys = s.f(...vs)

  vs.push(...symlist(sctr, tys.length - vs.length))
  while(vs.some(v => v.ty == Hole)){

    zip(tys, vs, (ty, v)=> Object.assign(v, {ty}))
  }
  return vs
}


let argnames = (f: Function) =>{
  let s = f.toString()
  let match = s.match(/\(([^)]*)\)/)
  if (!match) return []
  return match[1].split(',').map(x => x.trim()).slice(0, f.length)
}


let names = new Map<Term, string>()
let book = new Map<string, Term>([
  ["Type", Type]
])


function store(t: Term, name: string){
  names.set(t, name)
  book.set(name, t)
  console.log(`${name} = ${fmt(t, true)}`)
}

// let rfl = Lam((T, x) => [
//   () => [Type, T, $(EQ, T, x, x)],
//   () => Lam((e, P, h) => [ () => [], () => h ]) ])
// store(rfl, "rfl")


export function fmt(t: Term, def?: boolean){

  let scounter = {c: 0}

  function pln(t:Term, def? : boolean):string{

    if (names.has(t) && !def) return names.get(t)!

    function gofn(f: F, argty?:Term): string{
      let s = symlist(scounter, f.length, argty)
      return `({${s.map(v => pln(v)).join(', ')}}) => ${pln(f.f(...s))}`
    }

    function gosig(s: Sign): string{
      return fillSign(scounter, s).map(v => pln(v)+": "+ pln(v.ty)).join(', ')
    }

    if (t == Hole) return '_'
    // if (t == rfl) return 'rfl'
    if (t.$ == "Type") return 'Type'
    if (t.$ == "ADT") return  t.variants.map(v=> `\n  | {${gosig(v)}}`).join('') 

    if (t.$ == "adt") return `#${t.tag}(${t.srcs.map(x=> pln(x)).join(', ')})`

    if (t.$ == "APP") return `${pln(t.fn)}(${ t.args.map(x => pln(x)).join(', ')})`
    if (t.$ == "Arrow"){
      let vs = fillSign(scounter, t.DOM)
      return `(${vs.map(v => `${pln(v)} : ${pln(v.ty)}`).join(', ')}) -> ${pln(t.COD.f(...vs))}`
    }
  
    if (t.$ == "SYM") return typeof t.n == "number" ? `x${t.n}` : t.n
    if (t.$ == "match") return `match ${pln(t.scr)}:${t.srcs.map(x=> `\n  | ${gofn(x)}`).join('')}`
    if (t.$ == "Lam") {
      if (t.ty.$ == "Arrow"){
        let syms = fillSign(scounter, t.ty.DOM)

        return `(${syms.map(v => `${pln(v)} : ${pln(v.ty)}`).join(', ')}):${pln(t.ty.COD.f(...syms))} => ${pln(t.fn.f(...syms))}`
      }
      return `${t.fn.toString()}`
    }
    return t
  }
  return pln(t, def)

}

function run(t:Term): Term{
  if (t.$ == undefined) return t

  if (t.$ == "APP"){
    let fn = run(t.fn)
    if (fn.$ == "Lam") return run(fn.fn.f(...t.args))
  }
  if (t.$ == "match"){
    let arg = run(t.scr)
    if (arg.$ == "adt") return run(t.srcs[arg.tag].f(...arg.srcs))
  }
  
  return t
}


function checkEQ(a: Term, b: Term){
  if (a == b) return
  [a,b] = [run(a), run(b)]
  if (a.$ != b.$) {
    if (a.$ == "match"){
      for (let arm of a.srcs){
        if (arm.length > 0) raise(`Structural mismatch: ${fmt(a)} vs ${fmt(b)}`)
        checkEQ(arm.f(), b)
      }
      return
    }
    raise(`Structural mismatch: ${fmt(a)} vs ${fmt(b)}`)
  }
  if (a.$ == "SYM") if (a!=b) raise(`Structural mismatch: ${fmt(a)} vs ${fmt(b)}`)
  if (a.$ == "ADT"){
    b = b as ADT
    if (a.variants.length != b.variants.length) raise(`Structural mismatch: ${fmt(a)} vs ${fmt(b)}`)
    zip(a.variants, b.variants, (v1, v2)=>{
      let vs = fillSign({c:0}, v1)
      zip(v1.f(...vs), v2.f(...vs), (a,b)=> checkEQ(a,b))
    })
  }
  if (a.$ == "adt"){
    if (a.tag != (b as adt).tag) raise(`Structural mismatch: ${fmt(a)} vs ${fmt(b)}`)
    zip(a.srcs, (b as adt).srcs, (x, y)=> checkEQ(x, y))
  }
  if (a.$ == "APP"){
    checkEQ(a.fn, (b as APP).fn)
    zip(a.args, (b as APP).args, (x, y)=> checkEQ(x, y))
  }
  if (a.$ == "match"){
    checkEQ(a.scr, (b as match).scr)
    zip(a.srcs, (b as match).srcs, (x, y)=> {
      let vs = symlist({c:0}, Math.max(x.length, y.length))
      checkEQ(x.f(...vs), y.f(...vs))
    })
  }

  if (a.$ == "Arrow"){
    let vs = fillSign({c:0}, a.DOM)
    b = b as Arrow
    zip(a.DOM.f(...vs), b.DOM.f(...vs), (x, y)=> checkEQ(x, y))
    checkEQ(a.COD.f(...vs), b.COD.f(...vs)) 
  }

  if (a.$ == "Lam" || a.$ == "SYM"){
    raise(`Structural mismatch: ${fmt(a)} vs ${fmt(b)}`)
  }
}

function wellFounded(A: Term, a: Term):boolean{
  // if (A.$ != a.$) return false
  if (A == a) return false 

  show("A:", A.$)
  if (A.$ == "adt"){
    for(let el of A.srcs){
      if (el == a) return true
    }
  }
  return false
}


function asTag <$ extends Term["$"]>(t: Term, tag: $) : Term & {$: $}{
  t = run(t)
  if (t.$ != tag) raise(`Expected tag ${tag}, got ${t.$} in term ${fmt(t)}`)
  return t as Term & {$: $}
}


// let EQ = Lam((T, a, b)=>[
//   () => [Type, T, T, Type],
//   () => Arrow((P, h) => [ Arrow((x)=> [T, Type]), $(P, a), $(P, b)])
// ])
// EQ.name = "EQ"
// store(EQ, "EQ")


function check(t:Term){

  let symCounter = {c: 0}
  // let seen = new Set<Term>()

  type CallStack = {
    f: Term
    args: Term[]
    prev: CallStack
  } | null


  function go(t:Term, cs: CallStack, ty?:Term) :Term{

    // if(t == rfl) return t

    function checkSig(args: Term[], sig: Sign){
      let A = sig.f(...args)
      zip(A, args, (a,t)=> go(t, cs, a))
    }

    if (ty) checkEQ(t.ty, ty)

    function searchStack(c: CallStack, t: Term){
      c = cs
      while (c){
        if (c.f == t) return c
        c = c.prev
      } 
    }

    const type = run(t.ty)

    switch(t.$){
      case "match":{
        let arg = asTag(t.scr, "SYM")
        let T = asTag(arg.ty, "ADT")
        let old : SYM = {...arg}
        zip(T.variants, t.srcs, (v, s, i)=>{
          let vs = fillSign(symCounter, v)
          Object.assign(arg, adt(T, i, ...vs))
          go(s.f(...vs), cs, type)
        })
        Object.assign(arg, old)
        break
      }
      case "adt":{
        checkSig(t.srcs, asTag(type, "ADT").variants[t.tag])
        break
      }
      case "Lam":{
        if (searchStack(cs, t)) raise(`Non well-founded lambda detected`)
        let aro = asTag(t.ty, "Arrow")
        let vs = fillSign(symCounter, aro.DOM)
        show(...vs)

        go(t.fn.f(...vs),  { f: t, args: vs, prev: cs } , aro.COD.f(...vs))
        break
      }
      
      case "APP":{
        let REC = searchStack(cs, t.fn)
        let aro = asTag(t.fn.ty, "Arrow")
        checkSig(t.args, aro.DOM)
        checkEQ(type, aro.COD.f(...t.args))
        if (REC){
          if (!zip(REC.args, t.args, (a,b)=>wellFounded(a,b)).some(x=>x)) raise(`Non well-founded application detected`)
        }else{
          go(t.fn, cs, aro.COD.f(...t.args))
        }
        break
      }

    }
    return t
  }

  go(t, null)

}

/**
 * 
 *  CONSTRUCTOR HELPERS
 *
 */

type FT = F | Term

// function hoas(f: FT): F {
//   return typeof f == "function" ? f : () => f
// }

function Arrow(Ts: (...x: Term[]) => Term[]): Arrow{
  let names = argnames(Ts)
  let tys = Ts(...symlist({c:0}, Ts.length))
  let length = tys.length - 1
  let DOM :Sign = {names, length, f: (...x: Term[]) => Ts(...x).slice(0,length)}
  let COD = { f: (...x: Term[]) => Ts(...x)[length] , length }
  return {$: "Arrow", ty: Type, DOM, COD }
}

function ADT(variants: Sign[], name?: string): ADT{
  let res : ADT = { $: "ADT", ty: Type, variants }
  if (name) store(res, name)
  return res
}

function adt(ty: Term, tag: number, ...srcs: Term[]): adt{
  return { $: "adt", ty, tag, srcs }
}

function Sigma(sig: Sign): ADT{ return ADT([sig])}
function TUPLE(...srcs: Term[]): ADT{ return ENUM(srcs)}

function ENUM(...cases: Term[][]): ADT{
  return ADT(cases.map(c => ({length: c.length, f: (...x: Term[]) => c } ) ))
}

function tuple(...srcs: Term[]): adt{
  return adt(TUPLE(...srcs.map(x=>x.ty)), 0, ...srcs)
}

function sym(n: number, ty: Term) :SYM {
  return { $: "SYM", n, ty }
}

// function Lam(def: (...args: Term[]) => [ ()=>Term[], ()=>Term], name? : string) : Lam{

//   let names = argnames(def)

//   function T(...x: Term[]) {
//     let res = def(...x)[0]()
//     if (res.length != x.length + 1) raise(`Unexpected result length: expected ${x.length + 1}, got ${res.length}\nin function:${def.toString()} did you forget to provide a return type?`)
//     return res
//   }

//   let ty: Arrow = {
//     $: "Arrow",
//     ty: Type,
//     DOM: {names, length: names.length, f: (...x: Term[]) => T(...x).slice(0,-1) },
//     COD: { f: (...x: Term[]) => T(...x)[names.length], length: names.length }
//   }

//   let res : Lam = { $: "Lam" , ty, fn: { f: (...x: Term[]) => def(...x)[1](), length: names.length } }
//   if (name) store(res, name)
//   return res
// }


function $(fn: Term, ...args: Term[]): APP{
  let ty = fn.ty == Hole ? Hole : asTag(fn.ty, "Arrow").COD.f(...args)
  return { $: "APP", ty, fn, args }
}

function match(scr: Term, srcs: F[], ty?: Term): match{

  // console.log(srcs)

  if (!ty){
    // ty = {$: "match", ty: Type, scr, srcs: srcs.map(f => (...x: Term[]) => f.f(...x).ty) }
    ty = {$: "match", ty: Type, scr, srcs: srcs.map(f => ({length: f.length, f: (...x: Term[]) => f.f(...x).ty }) ) }

  }

  return { $: "match", ty, scr, srcs }
}


function rejec(term: Term){
  try{ check(term) }
  catch(e){ return }
  throw new Error(`Term accepted: ${fmt(term)}`)
}

export function show(...t: (Term | string| number)[]) { console.log(t.map(x=> typeof x == "string" || typeof x == "number" ? x : fmt(x)).join(" "))}


let NULL = TUPLE()
store(NULL, "NULL")
show(NULL)

let Null = adt(NULL, 0)
store(Null, "Null")

let BOOL = ENUM([], [])
store(BOOL, "BOOL")
show(BOOL)
let True = adt(BOOL, 1)
store(True, "True")
let False = adt(BOOL, 0)
store(False, "False")

show(True)
check(True)

// check(Lam(x=> [()=> [BOOL, BOOL], ()=> x ]))
// rejec(Lam(x=> [()=> [BOOL, NULL], ()=> x ]))



// check(match(sym(0, BOOL), [x=>True, x=>False]))

// check(Lam(x=> [()=> [BOOL, BOOL], ()=>match(x, [x=>True, x=>False])]))

// rejec(Lam(x=> [()=> [BOOL, NULL], ()=>match(x, [x=>True, x=>Null])]))



// rejec(Lam(x=> [()=> [BOOL, NULL], ()=> match(x, [x=>True, x=>False])]))
// rejec(Lam(x=> [()=> [NULL, BOOL], ()=> match(x, [x=>True, x=>False])]))
// rejec(Lam(x=> [()=> [BOOL, BOOL], ()=> match(x, [x=>True, x=>Null])]))
// check(Lam(x=> [()=> [BOOL, BOOL], ()=> match(x, [x=>True, _=>x])]))

// rejec(Lam(x=> [()=> [BOOL], ()=> NULL ]))

// checkEQ(match(True, [x=>True, x=>False]), False)


// let TF = Lam(b=> [()=> [BOOL, Type], ()=> match(b, [x=>NULL, x=>BOOL])], "TF")


// show(TF)
// check(TF)


// check(Lam(b=> [()=> [BOOL, $(TF, b)], ()=> match(b, [_=>Null, _=>True], $(TF, b))]))
// rejec(Lam(b=> [()=> [BOOL, $(TF, b)], ()=> match(b, [_=>Null, _=>Null], $(TF, b))]))
// rejec(Lam(b=> [()=> [BOOL, $(TF, b)], ()=> match(b, [_=>True, _=>True], $(TF, b))]))


// let p1 = Lam((T,a,b,eq,P,h)=>[
//   () => [Type, T, T, $(EQ, T, a, b), Arrow(T=>[T,Type]), $(P, a), $(P, b)],
//   () => $(eq, P, h)
// ])

// check(p1)


// rejec(Lam((T,a,b,e,P,h)=>[
//   () => [Type, T, T, $(EQ, T, a, a), Arrow(T=>[T,Type]), $(P, a), $(P, b)],
//   () => $(e, P, h)
// ]))

// rejec(Lam((T,a,b,e,P,h)=>[
//   () => [Type, T, T, $(EQ, T, a, b), Arrow(T=>[T,Type]), $(P, a), $(P, a)],
//   () => $(e, P, h)
// ]))

// rejec(Lam((T,a,b,e,P,h)=>[
//   () => [Type, T, T, $(EQ, T, a, b), Arrow(T=>[T,Type]), $(P, a), $(P, b)],
//   () => $(a, P, h)
// ]))



// let EQ_trans = Lam((T, a, b, c, eq_ab, eq_bc) =>{
//   let EQT: F = (x,y) => $(EQ, T, x, y)
//   let P = Lam(x=> [ ()=> [T, Type], ()=> EQT(a, x) ])
//   return [
//     () => [ Type, T,T,T, EQT(a, b), EQT(b, c), EQT(a, c) ],
//     () => $( eq_bc, P, eq_ab )
//   ]
// })


// show(EQ_trans)
// check(EQ_trans)

let Nat = ENUM([], [])
Object.assign(Nat, ENUM([], [Nat]))
store(Nat, "Nat")



let Zero = adt(Nat, 0)
store(Zero, "Zero")
// let Succ = Lam(n=> [()=> [Nat, Nat], ()=> adt(Nat, 1, n)])
// store(Succ, "Succ")

// let One = $(Succ, Zero)
// store(One, "One")

let EMPTY = ADT([], "EMPTY")

// let exfN = Lam(x=> [()=> [EMPTY, Nat], ()=> match(x, [], Nat)])
// check(exfN)

// let z0_transport = Lam(n => [
//   () => [Nat, Type],
//   () => match(n, [_ => NULL, _ => EMPTY])
// ])

// check(z0_transport)

// let eq10_to_empty = Lam(h => [
//   () => [ $(EQ, Nat, Zero, One), EMPTY ],
//   () => $( h, z0_transport, Null )
// ])

// check(eq10_to_empty)



// let BAD = Lam(x=> [()=> [Nat, Nat], () => $(BAD, x)])

// rejec(BAD)


// let recc = Lam(n=> [
//   () => [Nat, Nat],
//   () => match(n, [
//     _ => Zero,
//     p => $(recc, p),
//   ])
// ])
// store(recc, "recc")
// check(recc)

// let BadSink = Lam(f=>[
//   () => [Arrow(x=> [Nat, Nat]), Nat],
//   () => Zero
// ])
// store(BadSink, "BadSink")
// check(BadSink)

// let BadPass = {} as Lam
// Object.assign(BadPass, Lam(x=>[
//   () => [Arrow(x=>[Nat, Nat]), Nat],
//   () => $(BadSink, BadPass)
// ]))
// store(BadPass, "BadPass")

// rejec(BadPass)

import {mktree, synt} from "./lisp"

function compileFN(s: string) : Term{
  let tr = mktree(s);

  function asIden(tr: synt): string{
    if (typeof tr != "string") raise(`expected an identifier, but got: ${JSON.stringify(tr)}`)
    return tr
  }

  type Ctx = string[]

  function asAnnot (tr: synt, ctx: Ctx): [string, string]{
    if (!Array.isArray(tr) || tr.length < 3 || tr[1] != ":") raise(`expected an annotation of the form [expr, ":", type], but got: ${JSON.stringify(tr)}`)
    let [v,,t] = tr
    if (typeof v != "string") raise(`expected an identifier for the variable name, but got: ${JSON.stringify(v)}`)
    return [v, goTerm(t, ctx)]
  }



  function splitList(tr: synt, sep: string): synt[]{
    let res: synt[] = []
    let idx = 0
    while (idx < tr.length){
      let nextIdx = tr.indexOf(sep, idx)
      if (nextIdx == -1) nextIdx = tr.length
      res.push(tr.slice(idx, nextIdx))
      idx = nextIdx + 1
    }
    return res
  }

  function goTerm(tr: synt, ctx: Ctx): string{
    if (typeof tr == "string") {
      if (!ctx.includes(tr)) {
        if (book.has(tr)) return `book.get("${tr}")`
        raise(`unbound identifier: ${tr}`)}
      return tr
    }
    if (Array.isArray(tr)) {
      if (tr.length == 1) return goTerm(tr[0], ctx)
      if (tr[0] == "match") {
        let arms = splitList(tr, "|").slice(1)
        return`match(${goTerm(tr[1], ctx)}, [${arms.map(arm => {
          let [pat, expr] = splitList(arm, "=>")
          if (typeof pat == "string") pat = [pat]
          for (let p of pat) if (typeof p != "string") raise(`expected a string in the pattern, but got: ${JSON.stringify(p)}`)
          return `{length: ${pat.length}, f: (${pat.join(", ")})=>${goTerm(expr, [...ctx, ...pat as string[]])}}`
        }).join(", ")}])`
      }

      return `$( ${tr.map(x=>goTerm(x, ctx)).join(", ")} )`


    }
    raise(`expected a term, but got: ${JSON.stringify(tr)}`)
  }

  function mkSign(args: [string, string][]): string{
    return `({
    names: [${args.map(([v, _])=>`"${v}"`).join(", ")}],
    length: ${args.length},
    f: ${mkFun(args, `[${args.map(([_, t])=>t).join(", ")}]`)},
  })`
  }

  function mkFun(args: [string, string][], bod: string): string{
    return `((${args.map(([v, _])=>v).join(", ")})=>${bod})`
  }

  let ctx :Ctx = []
  function go(tr: synt): string{
    if (typeof tr == "string") {

    }else{
      let name = asIden(tr[0])
      if (Array.isArray(tr[1])){
        console.log({name})
        let colIdx = tr.findIndex(x=> x == ":")
        let eqIdx = tr.findIndex(x=> x == "=")
        if (colIdx == -1) raise(`expected a ":" in the function declaration, but got: ${JSON.stringify(tr)}`)
        if (eqIdx == -1) raise(`expected a "=" in the function declaration, but got: ${JSON.stringify(tr)}`)
        let args = tr.slice(1, colIdx).map(x=>asAnnot(x , ctx))
        ctx = [...ctx, ...args.map(([v, _])=>v)]
        let retType = goTerm(tr[colIdx + 1], ctx)
        let body = goTerm(tr.slice(eqIdx + 1), ctx)

        let argvs = `(${args.map(([v, _])=>v).join(", ")})=>`
        
        return [
          `({$: "Lam",`,
          `name: "${name}",`,
          `ty: {`,
          `  $: "Arrow",`,
          `  DOM: ${mkSign(args)},`,
          `  COD: { length: ${args.length}, f: ${argvs} ${retType}} },`,
          `fn: { length: ${args.length}, f: ${argvs} ${body} }`,
          `})`
        ].join("\n")
      }
    }

    return "{}"
  }

  let res = go(tr)
  show(res)

  let Ctx = {

    match,
    book,
    $,
  }

  let func = Function(...Object.keys(Ctx), `return ${res}`)(...Object.values(Ctx)) as Lam
  store(func, func.name)
  check(func)
  return func
}


compileFN("(f (x:Type) : Type = x)")

compileFN("(f (x:BOOL) : BOOL = match x | => x | => x)")

compileFN("(TF (x:BOOL) : Type = match x | => NULL | => BOOL)")

compileFN("(tfm (x:BOOL) : (TF x) = match x | => Null | => True)")

compileFN("(CHN () : Type = {} ) ")