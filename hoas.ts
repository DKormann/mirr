




// Types live in .ty; srcs contains only the node's children.
type F      = { $: "hoas", name?: string, srcs: [], hoas: (...t: Term[]) => Term }

type Type   = { ty: Term, $: "Type", name?: string, srcs: [] }

type Arrow  = { ty: Term, $: "Arrow", name?: string, srcs: [Term, F|Term] }
type SIG    = { ty: Term, $: "SIG", name?: string, srcs: (Term|F)[] }
type ENU    = { ty: Term, $: "ENU", name?: string, srcs: Term[] }

type TUP    = { ty: Term, $: "TUP", name?: string, srcs: Term[] }
type CHOICE = { ty: Term, $: "CHOICE", name?: string, tag: number, srcs: [Term] }
type COTUP  = { ty: Term, $: "COTUP", name?: string, srcs: [F] }
type COCHC  = { ty: Term, $: "COCHC", name?: string, srcs: F[]}
type APP    = { ty: Term, $: "APP", name?: string, srcs: [Term, Term] }
type SYM    = { ty: Term, $: "SYM", name?: string, n: number, srcs: [] }

type Term = Type | Arrow | SIG | ENU | TUP | CHOICE | COTUP | COCHC | APP | SYM

const Type = {$: "Type", srcs: []} as Type
Type.ty = Type

// TODO:


function raise(msg: string): never {
  throw new Error(msg)
}
const seen = new Set<Term>()
function fmt(t: Term){
  

  let scounter = 0
  let fresh = (type: Term) :SYM => ({ ty: type, $: "SYM", srcs: [], n: scounter++ })

  function go(t:Term , d:number):string{

    if (t.$ == "Type") return 'Type'

    if (t.$ == "Arrow") {
      let v = fresh(t.srcs[0])
      let cod = t.srcs[1]
      return `(${pln(v, d)}: ${pln(t.srcs[0], d)} -> ${pln(cod.$ == "hoas" ? cod.hoas(v) : cod, d)})`
    }
    if (t.$ == "SIG"){

      let vs: SYM[] = []
      for (let T of t.srcs){
        if ("hoas" in T){
          vs.push(fresh(T.hoas(...vs)))
        }else{
          vs.push(fresh(T))
        }
      }
      return `{${vs.map(v => `x${v.n} : ${pln(v.ty, d)}`).join(', ')}} : ${pln(t.ty, d)}`
    }


    if (t.$ == "ENU"){
      return `(${t.srcs.map(o => pln(o, d)).join(' | ')})`
    }

    if (t.$ == "CHOICE"){
      return `(#${t.tag}: ${pln(t.srcs[0], d)}) : ${pln(t.ty, d)}`
    }

    if (t.$ == "TUP"){
      return `{${t.srcs.map(f => pln(f, d)).join(', ')}} : ${pln(t.ty, d)}`
    }
    if ("n" in t) {
      return `x${t.n}`
    }
    if (t.$ == "APP"){
      return `(${pln(t.srcs[0], d)} ${pln(t.srcs[1], d)})`
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

  if ("srcs" in t) return t

  if (Array.isArray(t)){
    if (typeof t[0] == 'number') raise(`Unexpected number array: ${JSON.stringify(t)}`)
    return { ty: Type, $: "SIG", srcs: t.map(x => parseType(x)) }
  }


  if ("T" in t) return parseType(t.T)
  
  if ("enu" in t){
    return { ty: Type, $: "ENU", srcs: t.enu.map(x => parseType(x)) }
  }
  if ("sig" in t){
    return { ty: Type, $: "SIG",
      srcs: t.sig.map(x => typeof x == "function"
        ? { $: "hoas" as const, srcs: [] as [], hoas: (...t: Term[]) => parseType(x(...t)) }
        : parseType(x)) }
  }



  raise(`Unknown ttoks: ${JSON.stringify(t)}`)

}

function parseToks(t: toks, ty?: Term): Term{
  if ("srcs" in t) return t

  if (Array.isArray(t)) {
    if (typeof t[0] === 'number'){

      if (!ty) raise(`Unexpected number array without type: ${JSON.stringify(t)}`)
      return { ty, $: "CHOICE", tag: t[0], srcs: [parseToks(t[1])] }
    }

    let tms = t.map(x=> parseToks(x as ttoks))
    let T : SIG = {ty: Type, $:"SIG", srcs: tms.map(t => t.ty)}
    return { ty: ty ?? T, $: "TUP", srcs: tms}

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
    let f = whnf(t.srcs[0])
    if(f.$ == "COCHC"){
      let a = whnf(t.srcs[1])
      if (a.$ == "CHOICE"){
        return whnf(f.srcs[a.tag].hoas(a.srcs[0]))
      }
    }
    if (f.$ == "COTUP"){
      let a = whnf(t.srcs[1])
      if (a.$ == "TUP"){
        return whnf(f.srcs[0].hoas(...a.srcs))
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
  let type = whnf(t.ty)
  switch(t.$){
    case "SIG":{
      if (type.$ != "Type") raise(`Expected type for SIG, got: ${JSON.stringify(type)}`)
      break;
    }
    case "ENU":{
      if (type.$ != "Type") raise(`Expected type for ENU, got: ${JSON.stringify(type)}`)
      break;
    }
    case "TUP":{
      if (type.$ != "SIG") raise(`Expected type for TUP, got: ${JSON.stringify(type)}`)
      
      let Ts = type.srcs
      let fields = t.srcs
      if (Ts.length != fields.length) raise(`Expected ${Ts.length} fields for TUP, got: ${fields.length}`)
      let checked : Term [] = []
      for (let i = 0; i < Ts.length; i++){
        let T = Ts[i];
        if (T.$ == "Type"){
          let fl = fields[i]
          
        }
      }
    }
  }
}
