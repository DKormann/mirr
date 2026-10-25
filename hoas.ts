




type F = { $: "hoas",  hoas: (...t:Term[]) => Term } // | { fndef: Term }

type Type   = { ty: Term, $: "Type" , name?: string}
type Arrow  = { ty: Term, $: "Arrow" , name?: string, DOM: Term, COD: F }
type SIG    = { ty: Term, $: "SIG" , name?: string, Ts: (Term| F) [] }
type ENU    = { ty: Term, $: "ENU", name?: string, options: Term[] }
type TUP    = { ty: Term, $: "TUP", name?: string, fields: Term[] }
type CHOICE = { ty: Term, $: "CHOICE", name?: string, tag: number, C: Term }
type COTUP  = { ty: Term, $: "COTUP", name?: string, bod: F }
type COCHC  = { ty: Term, $: "COCHC", name?: string, arms: F[] }
type APP    = { ty: Term, $: "APP", name?: string, F: Term, ARG: Term }
type SYM    = { ty: Term, $: "SYM", name?: string, n: number }

type Term = Type | Arrow | SIG | ENU | TUP | CHOICE | COTUP | COCHC | APP | SYM


const Type = {$: "Type"} as Type
Type.ty = Type



function raise(msg: string): never {
  throw new Error(msg)
}
const seen = new Set<Term>()
function fmt(t: Term){
  

  let scounter = 0
  let fresh = (ty: Term) :SYM => ({ ty, $: "SYM", n: scounter++ })

  function go(t:Term , d:number):string{

    if (t.$ == "Type") return 'Type'

    if (t.$ == "Arrow") {
      let v = fresh(t.DOM)
      return `(${pln(v, d)}: ${pln(t.DOM, d)} -> ${pln(t.COD.hoas(v), d)})`
    }
    if (t.$ == "SIG"){

      let vs: SYM[] = []
      for (let T of t.Ts){
        if ("hoas" in T){
          vs.push(fresh(T.hoas(...vs)))
        }else{
          vs.push(fresh(T))
        }
      }
      return `{${vs.map(v => `x${v.n} : ${pln(v.ty, d)}`).join(', ')}} : ${pln(t.ty, d)}`
    }


    if ("options" in t){
      return `(${t.options.map(o => pln(o, d)).join(' | ')})`
    }

    if ("tag" in t){
      return `(#${t.tag}: ${pln(t.C, d)}) : ${pln(t.ty, d)}`
    }

    if ("fields" in t){
      return `{${t.fields.map(f => pln(f, d)).join(', ')}} : ${pln(t.ty, d)}`
    }
    if ("n" in t) {
      return `x${t.n}`
    }
    if (t.$ == "APP"){
      return `(${pln(t.F, d)} ${pln(t.ARG, d)})`
    }

    if (t.$ == "COTUP"){
      let vs: SYM[] 
    }


    console.log(t)
    raise(`Unknown term`)
    
  }

  let res = ''


  function pln(t:Term, d:number):string{
    if (t.name){
      if (seen.has(t)) return t.name
      let l = `${t.name} = ${go(t, 0)}\n`
      res += l
      seen.add(t)
      return t.name
    }
    return go(t, 0)
  }

  let k = pln(t, 0)
  return res + k

}

type ff = ((...x: Term[]) => toks)
type ft = ((...x: Term[]) => ttoks)
type ttoks = {enu: ttoks[]} | ttoks[] | Term | { T: ttoks } | {sig : (ttoks | ft)[]}
type toks = ttoks | [number, toks] | ff | {mat: ff[]}




function parseType(t: ttoks): Term {

  if (t == Type) return Type

  if ("ty" in t) return t

  if (Array.isArray(t)){
    if (typeof t[0] == 'number') raise(`Unexpected number array: ${JSON.stringify(t)}`)
    return { ty: Type, $: "SIG", Ts: t.map(x=> parseType(x)) }
  }


  if ("T" in t) return parseType(t.T)
  
  if ("enu" in t){
    return { ty: Type, $: "ENU", options: t.enu.map(x => parseType(x)) }
  }
  if ("sig" in t){
    return { ty: Type, $: "SIG",
      Ts: t.sig.map(x => typeof x =="function"
        ? { $: "hoas" , "hoas": (...t:Term[])=>parseType(x(...t))}
        : parseType(x)) }
  }



  raise(`Unknown ttoks: ${JSON.stringify(t)}`)

}

function parseToks(t: toks, ty?: Term): Term{
  if ("ty" in t) return t

  if (Array.isArray(t)) {
    if (typeof t[0] === 'number'){

      if (!ty) raise(`Unexpected number array without type: ${JSON.stringify(t)}`)
      return { ty: ty, $: "CHOICE", "tag": t[0], C : parseToks(t[1]) }
    }

    let tms = t.map(x=> parseToks(x as ttoks))
    let T : SIG = {ty: Type, $:"SIG", Ts: tms.map(t=>t.ty)}
    return { ty: ty ?? T, $: "TUP", fields: tms}

  }

  return parseType(t as ttoks)
}


function print(t:toks){
  console.log(fmt(parseToks(t)))
}

let NULL = parseToks({T:[]})
NULL.name = "NULL"
let Null = parseToks([], NULL)
Null.name = "Null"

let BOOL = parseToks({enu: [NULL, NULL]})
BOOL.name = "BOOL"

let TRUE = parseToks([0, Null], BOOL)
TRUE.name = "TRUE"


print(TRUE)

let BB2 = parseToks({sig: [BOOL, BOOL]})
print(BB2)

let SIG1 = parseToks({sig: [Type, x=>{return x}]})

print(SIG1)

function whnf(t:Term): Term{
  if (t.$ == "APP"){
    let f = whnf(t.F)
    if(f.$ == "COCHC"){
      let a = whnf(t.ARG)
      if (a.$ == "CHOICE"){
        return whnf(f.arms[a.tag].hoas(a.C))
      }
    }
    if (f.$ == "COTUP"){
      let a = whnf(t.ARG)
      if (a.$ == "TUP"){
        return whnf(f.bod.hoas(...a.fields))
      }
    }
  }
  return t
}

function structeEQ(a: Term, b: Term){
  if (a == b) return
  [a,b] = [whnf(a), whnf(b)]
  if (a.$ != b.$) raise(`Structural mismatch: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`)
  
}

function checkTerm(t: Term){
  let ty = whnf(t.ty)
  switch(t.$){
    case "SIG":{
      if (ty.$ != "Type") raise(`Expected type for SIG, got: ${JSON.stringify(ty)}`)
      break;
    }
    case "ENU":{
      if (ty.$ != "Type") raise(`Expected type for ENU, got: ${JSON.stringify(ty)}`)
      break;
    }
    case "TUP":{
      if (ty.$ != "SIG") raise(`Expected type for TUP, got: ${JSON.stringify(ty)}`)
      
      let Ts = ty.Ts
      if (Ts.length != t.fields.length) raise(`Expected ${Ts.length} fields for TUP, got: ${t.fields.length}`)
      let checked : Term [] = []
      for (let i = 0; i < Ts.length; i++){
        let T = Ts[i];
        if (T.$ == "Type"){
          let fl = t.fields[i]
          
        }
      }
    }
  }
}
