type F        = ((...t: Term[]) => Term)
type Sign     = {names?: string[], length: number, f: (...t:Term[]) => Term[]}

type Type     = { ty: Term, $: "Type",     name?: string }
type Arrow    = { ty: Term, $: "Arrow",    name?: string, DOM: Sign, COD: F }

type ADT      = { ty: Term, $: "ADT",      name?: string, variants:  Sign[]}
type adt      = { ty: Term, $: "adt",      name?: string, tag: number, srcs: Term[] }

type match    = { ty: Term, $: "match",    name?: string, scr: Term, srcs: F[] }
type APP      = { ty: Term, $: "APP",      name?: string, fn: Term, args: Term[] }
type Lam      = { ty: Term, $: "Lam",      name?: string, fn: F}

type SYM      = { ty: Term, $: "SYM",      name?: string, n: number | string }
type Term = Type | Arrow | ADT | adt | match | APP | Lam | SYM


let Hole = {} as Term

const Type : Term = {$: "Type" ,ty: Hole}
Type.ty = Type

function raise(msg: string): never {
  throw new Error(msg)
}
const seen = new Set<Term | F>()



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



function fmt(t: Term){

  let scounter = {c: 0}

  function go(t:Term ):string{

    function gofn(f: F, argty?:Term): string{

      let s = symlist(scounter, f.length, argty)
      return `({${s.map(v => pln(v)).join(', ')}}) => ${pln(f(...s))}`
    }

    function gosig(s: Sign): string{
      return fillSign(scounter, s).map(v => pln(v)+": "+ pln(v.ty)).join(', ')
    }

    if (t == Hole) return '_'
    if (t == rfl) return 'rfl'
    if (t.$ == "Type") return 'Type'
    if (t.$ == "ADT") return  t.variants.map(v=> `\n  | {${gosig(v)}}`).join('') 

    if (t.$ == "adt") return `#${t.tag}(${t.srcs.map(x=> pln(x)).join(', ')})`

    if (t.$ == "APP") return `${pln(t.fn)}(${ t.args.map(x => pln(x)).join(', ')})`
    if (t.$ == "Arrow"){
      let vs = fillSign(scounter, t.DOM)
      return `(${vs.map(v => `${pln(v)} : ${pln(v.ty)}`).join(', ')}) -> ${pln(t.COD(...vs))}`
    }
  
    if (t.$ == "SYM") return typeof t.n == "number" ? `x${t.n}` : t.n
    if (t.$ == "match") return `match ${pln(t.scr)}:${t.srcs.map(x=> `\n  | ${gofn(x, )}`).join('')}`
    if (t.$ == "Lam") {
      if (t.ty.$ == "Arrow"){
        let syms = fillSign(scounter, t.ty.DOM)
        return `(${syms.map(v => `${pln(v)} : ${pln(v.ty)}`).join(', ')}):${pln(t.ty.COD(...syms))} => ${pln(t.fn(...syms))}`
      }
      return `${t.fn.toString()}`
    }


    return t

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

function run(t:Term): Term{
  if (t.$ == undefined) return t

  if (t.$ == "APP"){
    let fn = run(t.fn)
    if (fn.$ == "Lam") return run(fn.fn(...t.args))
  }
  if (t.$ == "match"){
    let arg = run(t.scr)
    if (arg.$ == "adt") return run(t.srcs[arg.tag](...arg.srcs))
  }
  
  return t
}

function checkEQ(a: Term, b: Term){
  if (a == b) return
  [a,b] = [run(a), run(b)]

  if (a.$ != b.$) raise(`Structural mismatch: ${fmt(a)} vs ${fmt(b)}`)
  if (a.$ == "SYM") if (a!=b) raise(`Structural mismatch: ${fmt(a)} vs ${fmt(b)}`)
  if (a.$ == "ADT"){
    zip(a.variants, (b as ADT).variants, (v1, v2)=>{
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


let EQ = Lam((T, a, b)=>[
  () => [Type, T, T, Type],
  () => Arrow((P, h) => [ Arrow((x)=> [T, Type]), $(P, a), $(P, b)])
])


EQ.name = "EQ"


let rfl = Lam((T, x) => [
  () => [Type, T, $(EQ, T, x, x)],
  () => Lam((e, P, h) => [ () => [], () => h ]) ])
rfl.name = "rfl"

function check(t:Term){

  let symCounter = {c: 0}
  // let seen = new Set<Term>()

  type CallStack = {
    f: Term
    args: Term[]
    prev: CallStack
  } | null


  function go(t:Term, cs: CallStack, ty?:Term) :Term{

    if(t == rfl) return t

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
          go(s(...vs), cs, type)
        })
        Object.assign(arg, old)
        break
      }

      case "adt":{

        checkSig(t.srcs, asTag(type, "ADT").variants[t.tag])

        break
      }

      case "Lam":{
        let aro = asTag(t.ty, "Arrow")
        let vs = fillSign(symCounter, aro.DOM)
        go(t.fn(...vs),  { f: t, args: vs, prev: cs } , aro.COD(...vs))
        break
      }
      
      case "APP":{

        let REC = searchStack(cs, t.fn)
        let aro = asTag(t.fn.ty, "Arrow")

        checkSig(t.args, aro.DOM)
        checkEQ(type, aro.COD(...t.args))
        if (REC){
          if (!zip(REC.args, t.args, (a,b)=>wellFounded(a,b)).some(x=>x)) raise(`Non well-founded application detected`)
        }else{
          go(t.fn, cs, aro)
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

function hoas(f: FT): F {
  return typeof f == "function" ? f : () => f
}

function Arrow(Ts: (...x: Term[]) => Term[]): Arrow{
  let names = argnames(Ts)
  let tys = Ts(...symlist({c:0}, Ts.length))
  let length = tys.length - 1
  let DOM :Sign = {names, length, f: (...x: Term[]) => Ts(...x).slice(0,length)}
  let COD = (...x: Term[]) => Ts(...x)[length]
  return {$: "Arrow", ty: Type, DOM, COD }
}

function ADT(variants: Sign[], name?: string): ADT{
  return { $: "ADT", ty: Type, variants, name }
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

function Lam(def: (...args: Term[]) => [ ()=>Term[], ()=>Term]) : Lam{

  let names = argnames(def)

  function T(...x: Term[]) {
    let res = def(...x)[0]()
    if (res.length != x.length + 1) raise(`Unexpected result length: expected ${x.length + 1}, got ${res.length}\nin function:${def.toString()}`)
    return res
  }

  let ty: Arrow = {
    $: "Arrow",
    ty: Type,
    DOM: {names, length: names.length, f: (...x: Term[]) => T(...x).slice(0,-1) },
    COD: (...x: Term[]) => T(...x)[names.length],
  }
  return {$: "Lam" , ty, fn: (...x:Term[]) => def(...x)[1]()}
}


function $(fn: Term, ...args: Term[]): APP{
  let ty = fn.ty == Hole ? Hole : asTag(fn.ty, "Arrow").COD(...args)
  return { $: "APP", ty, fn, args }
}

function match(scr: Term, srcs: F[], ty?: Term): match{

  ty ??= srcs[0](...(scr.ty.$ == "ADT" ? fillSign({c:0}, scr.ty.variants[0]) : [])).ty
  return { $: "match", ty, scr, srcs }
}


/**
 * 
 *  TESTING
 *
 */

function rejec(term: Term){
  try{ check(term) }
  catch(e){ return }
  throw new Error(`Term accepted: ${fmt(term)}`)
}

function show(...t: (Term | string| number)[]) { console.log(t.map(x=> typeof x == "string" || typeof x == "number" ? x : fmt(x)).join(" "))}


let NULL = TUPLE()
NULL.name = "NULL"
show(NULL)

let Null = adt(NULL, 0)
Null.name = "Null"

let BOOL = ENUM([], [])
BOOL.name = "BOOL"
show(BOOL)
let True = adt(BOOL, 1)
True.name = "True"
let False = adt(BOOL, 0)
False.name = "False"

show(True)
check(True)

check(Lam(x=> [()=> [BOOL, BOOL], ()=> x ]))
rejec(Lam(x=> [()=> [BOOL, NULL], ()=> x ]))



check(match(sym(0, BOOL), [x=>True, x=>False]))
rejec(match(sym(0, BOOL), [x=>True, x=>Null]))


check(Lam(x=> [()=> [BOOL, BOOL], ()=>match(x, [x=>True, x=>False])]))
rejec(Lam(x=> [()=> [BOOL, NULL], ()=>match(x, [x=>True, x=>Null])]))



rejec(Lam(x=> [()=> [BOOL, NULL], ()=> match(x, [x=>True, x=>False])]))
rejec(Lam(x=> [()=> [NULL, BOOL], ()=> match(x, [x=>True, x=>False])]))
rejec(Lam(x=> [()=> [BOOL, BOOL], ()=> match(x, [x=>True, x=>Null])]))
check(Lam(x=> [()=> [BOOL, BOOL], ()=> match(x, [x=>True, _=>x])]))

rejec(Lam(x=> [()=> [BOOL], ()=> NULL ]))

checkEQ(match(True, [x=>True, x=>False]), False)


let TF = Lam(b=> [()=> [BOOL, Type], ()=> match(b, [x=>NULL, x=>BOOL])])
TF.name = "TF"



show(TF)
check(TF)


check(Lam(b=> [()=> [BOOL, $(TF, b)], ()=> match(b, [_=>Null, _=>True], $(TF, b))]))
rejec(Lam(b=> [()=> [BOOL, $(TF, b)], ()=> match(b, [_=>Null, _=>Null], $(TF, b))]))
rejec(Lam(b=> [()=> [BOOL, $(TF, b)], ()=> match(b, [_=>True, _=>True], $(TF, b))]))


let p1 = Lam((T,a,b,eq,P,h)=>[
  () => [Type, T, T, $(EQ, T, a, b), Arrow(T=>[T,Type]), $(P, a), $(P, b)],
  () => $(eq, P, h)
])

check(p1)

rejec(Lam((T,a,b,e,P,h)=>[
  () => [Type, T, T, $(EQ, T, a, a), Arrow(T=>[T,Type]), $(P, a), $(P, b)],
  () => $(e, P, h)
]))

rejec(Lam((T,a,b,e,P,h)=>[
  () => [Type, T, T, $(EQ, T, a, b), Arrow(T=>[T,Type]), $(P, a), $(P, a)],
  () => $(e, P, h)
]))

rejec(Lam((T,a,b,e,P,h)=>[
  () => [Type, T, T, $(EQ, T, a, b), Arrow(T=>[T,Type]), $(P, a), $(P, b)],
  () => $(a, P, h)
]))



let EQ_trans = Lam((T, a, b, c, eq_ab, eq_bc) =>{
  let EQT: F = (x,y) => $(EQ, T, x, y)
  let P = Lam(x=> [ ()=> [T, Type], ()=> EQT(a, x) ])
  return [
    () => [ Type, T,T,T, EQT(a, b), EQT(b, c), EQT(a, c) ],
    () => $( eq_bc, P, eq_ab )
  ]
})


show(EQ_trans)
check(EQ_trans)

let Nat = ENUM([], [])
Object.assign(Nat, ENUM([], [Nat]))
Nat.name = "Nat"
show(Nat)


let Zero = adt(Nat, 0)
Zero.name = "Zero"
let Succ = Lam(n=> [()=> [Nat, Nat], ()=> adt(Nat, 1, n)])
Succ.name = "Succ"
show(Succ)

let One = $(Succ, Zero)
One.name = "One"
show(One)

let EMPTY = ADT([], "EMPTY")
show(EMPTY)

let exfN = Lam(x=> [()=> [EMPTY, Nat], ()=> match(x, [], Nat)])
check(exfN)

let z0_transport = Lam(n => [
  () => [Nat, Type],
  () => match(n, [_ => NULL, _ => EMPTY])
])

check(z0_transport)

let eq10_to_empty = Lam(h => [
  () => [ $(EQ, Nat, Zero, One), EMPTY ],
  () => $( h, z0_transport, Null )
])

check(eq10_to_empty)



let BAD = Lam(x=> [()=> [Nat, Nat], () => $(BAD, x)])

rejec(BAD)


let recc = Lam(n=> [
  () => [Nat, Nat],
  () => match(n, [
    _ => Zero,
    p => $(recc, p),
  ])
])
recc.name = "recc"
show(recc)

check(recc)
