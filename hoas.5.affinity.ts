(Error as any).stackTraceLimit = 100
export type Quant = 0 | 1
export type F        = {names: string[], length: number, f: (...t: Term[]) => Term}
export type Sign     = {slots: {name?: string, live:boolean } [], f: (...t: Term[]) => Term[]}
export type Uni      = { ty: Term, $: "Uni",       Quant : Quant}
export type Arrow    = { ty: Term, $: "Arrow",     DOM: Sign, COD: F }
export type ADT      = { ty: Term, $: "ADT",       variants:  Sign[]}
export type adt      = { ty: Term, $: "adt",       tag: number, srcs: Term[] }
export type match    = { ty: Term, $: "match",     scr: Term, srcs: F[] }
export type APP      = { ty: Term, $: "APP",       fn: Term, args: Term[] }
export type Lam      = { ty: Term, $: "Lam",       name: string, fn: F}
export type SYM      = { ty: Term, $: "SYM",       name?: string, live: boolean }
export type Term = Uni | Arrow | ADT | adt | match | APP | Lam | SYM

export let Hole = {} as Term
export const Type : Uni = {$: "Uni", Quant: 0, ty: Hole}
Type.ty = Type
const Data : Uni = {$: "Uni", Quant: 1, ty: Type}
let rfl = {} as Term

export function raise(msg: string): never {
  throw new Error(msg)
}

function zip<T,S,U>(ts: T[], s: S[], f: (t: T, s: S, i: number)=>U): U[] {
  if (ts.length !== s.length) throw new Error(`zip: arrays must have the same length, got ${ts.length} and ${s.length}`)
  return ts.map((t, i) => f(t, s[i], i))
}

let fillSign = ( s: Sign): SYM[] => {
  let vs = s.slots.map(slot => ({ $: "SYM", name: slot.name, live: slot.live, ty: Hole } as SYM))
  zip(s.f(...vs), vs, (ty, v)=> v.ty = ty)
  return vs
}

let book = new Map(Object.entries({Type, Data, rfl, Hole}))
let names = new Map(Array.from(book.entries()).map(([k, v]) => [v, k]))

function store(t: Term, name: string){
  names.set(t, name)
  book.set(name, t)
  if (!name.startsWith("_")) console.info(`${name} ${fmt(t, true)}`)
}

export function fmt(t: Term, def?: boolean){

  let stck = new Set<Term>() 
  function pln(t:Term, def? : boolean):string{
    if (names.has(t) && !def) return names.get(t)!
    function gofn(f: F, argty?:Term): string{
      let s = f.names.map(name => ({ $: "SYM", name, live: true, ty: argty } as SYM))
      return `({${s.map(v => pln(v)).join(', ')}}) => ${pln(f.f(...s))}`
    }

    if (t.$ == "Uni") return `type${t.Quant}`
    if (t.$ == "ADT") return  t.variants.map(v=> `\n  | {${ fillSign(v).map(v =>  pln(v)+": "+ pln(v.ty)).join(', ')}}`).join('') 
    if (t.$ == "adt") return `#${t.tag}(${t.srcs.map(x=> pln(x)).join(', ')})`
    if (t.$ == "APP") {
      return `(${pln(t.fn)} ${ t.args.map(x => pln(x)).join(' ')})`}
    if (t.$ == "Arrow"){
      let vs = fillSign(t.DOM)
      return `(${vs.map(v => `${pln(v)} : ${pln(v.ty)}`).join(', ')}) -> ${pln(t.COD.f(...vs))}`
    }

    if (t.$ == "SYM") return t.name ?? "?"
    if (t.$ == "match") return `match ${pln(t.scr)}:${t.srcs.map(x=> `\n  | ${gofn(x)}`).join('')}`

    if (t.$ == "Lam") {
      if (stck.has(t)) return `[rec ${names.get(t) ?? t.$}]`
      stck.add(t)
      if (t.ty.$ == "Arrow"){
        let syms = fillSign(t.ty.DOM)
        return `(${syms.map(v => `${(v.live ? "" : "-") +pln(v)} : ${pln(v.ty)}`).join(', ')}):${pln(t.ty.COD.f(...syms))} = ${pln(t.fn.f(...syms))}`
      }
      return `${t.fn.toString()}`
    }
    return t
  }
  return pln(t, def)

}

function run(t:Term): Term{
  if (t.$ == "APP"){
    let fn = run(t.fn)
    if (fn.$ == "Lam") return run(fn.fn.f(...t.args))
  }else if (t.$ == "match"){
    let arg = run(t.scr)
    if (arg.$ == "adt") return run(t.srcs[arg.tag].f(...arg.srcs))
  }
  return t
}


function checkEQ(a: Term, b: Term){

  if (a.$ == "APP" && b.$ == "APP" && a.fn == b.fn && a.args.length == b.args.length) {
    try {
      zip(a.args, b.args, (x, y) => checkEQ(x, y))
      return
    } catch (e) {
      if (!(e instanceof Error) || !e.message.startsWith("Structural mismatch:")) throw e
    }
  }

  [a,b] = [run(a), run(b)]
  if (a == b) return

  if (a.$ != b.$) {
    raise(`Structural mismatch: ${fmt(a)} vs ${fmt(b)}`)
  }
  if (a.$ == "SYM") if (a!=b) raise(`Structural mismatch: ${fmt(a)} vs ${fmt(b)}`)
  if (a.$ == "ADT"){
    b = b as ADT
    if (a.variants.length != b.variants.length) raise(`Structural mismatch: ${fmt(a)} vs ${fmt(b)}`)
    zip(a.variants, b.variants, (v1, v2)=>{
      let vs = fillSign( v1)
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
      let vs = x.names.map(name => ({ $: "SYM", name, live: true, ty: Hole } as SYM))
      if (x.f != y.f) checkEQ(x.f(...vs), y.f(...vs))
    })
  }

  if (a.$ == "Arrow"){
    let vs = fillSign( a.DOM)
    b = b as Arrow
    zip(a.DOM.slots, b.DOM.slots, (x,y) => {if (x.live != y.live) raise(`Live missmatch: ${fmt(a)} vs ${fmt(b)}`)})
    zip(a.DOM.f(...vs), b.DOM.f(...vs), (x, y)=> checkEQ(x, y))
    checkEQ(a.COD.f(...vs), b.COD.f(...vs)) 
  }
  if (a.$ == "Uni"){
    if (a.Quant != (b as Uni).Quant) raise(`Structural mismatch: ${fmt(a)} vs ${fmt(b)}`)
  }

  if (a.$ == "Lam" || a.$ == "SYM") raise(`Structural mismatch: ${fmt(a)} vs ${fmt(b)}`)
}


function asTag <$ extends Term["$"]>(t: Term, tag: $) : Term & {$: $}{
  t = run(t)
  if (t.$ != tag) raise(`Expected tag ${tag}, got ${t.$} in term ${fmt(t)}`)
  return t as Term & {$: $}
}

let checked = new Set<Term> ()

let sorry = {} as Term
book.set("sorry", sorry)

function check(t:Term){

  type CallStack = { f: Term, args: Term[]} []
  function go(t:Term, cs: CallStack, used: SYM[], ty:Term | undefined, live : boolean) : SYM[]{
    function checkSig(args: Term[], sig: Sign) : SYM[]{
      let A = sig.f(...args)
      if (A.length != args.length) raise(`Arity mismatch: expected ${A.length} arguments, got ${args.length}`)
      for (let i = 0; i < A.length; i++) {
        let argLive = live && sig.slots[i].live
        let newuse = go(args[i], cs, used, A[i], argLive)
        if (argLive) used = newuse
      }
      return used
    }

    if (t == sorry){
      console.warn(`Sorry: ${fmt(ty ?? Hole)}`)
      return used
    }

    if (ty && t.ty != Hole) {
      if (ty.$ == "Uni" && ty.Quant == 0 && t.ty.$ == "Uni" && t.ty.Quant == 1) {}
      else checkEQ(t.ty, ty)
    }

    if (t == rfl) return used
    function searchStack(c: CallStack, t: Term){ return c.find(x=>x.f == t) }

    let type = t.ty
    if (t.ty == Hole) {
      if (!ty) raise(`Cannot infer type for term ${fmt(t)}`)
      type = ty
    }
    if (checked.has(t)) return used
    type = run(type)

    if (t.$ == "Uni"){
      if (asTag(t.ty, "Uni").Quant != 0) raise(`Expected Uni Type, got ${fmt(t.ty)}`)

    } else if (t.$ == "match"){
      let arg = asTag(t.scr, "SYM")
      let T = asTag(arg.ty, "ADT")
      let old : SYM = {...arg}
      let newuses: SYM[] = go(arg, cs, used, arg.ty, live)
      zip(T.variants, t.srcs, (v, s, i)=>{
        let vs = fillSign( v)
        Object.assign(arg, adt(T, i, ...vs))
        newuses.push(... go(s.f(...vs), cs, used, type, live).filter(x=>![...newuses, ...vs].includes(x)))
      })
      Object.assign(arg, old)
      used = newuses

    } else if (t.$ == "SYM"){
      if (live && t.live) { if (type.ty != Data && used.includes(t)) raise(`Symbol ${fmt(t)} already used: ${fmt(t)}`) }
      else{ if (live) raise(`Symbol ${fmt(t)} is not live`) }
      if (live) used = [...used, t]

    } else if (t.$ == "adt"){
      let vari = asTag(type, "ADT").variants[t.tag]
      if (t.srcs.length != vari.slots.length) raise(`invalid constructor args for ${fmt(type)}: [${t.srcs.map(x=>fmt(x))}]`)
      return checkSig(t.srcs, vari)

    } else if (t.$ == "Lam"){
      if (searchStack(cs, t)) raise(`Non well-founded lambda detected`)
      let aro = asTag(t.ty, "Arrow")
      let vs = fillSign(aro.DOM)
      return go(t.fn.f(...vs),  [...cs, { f: t, args: vs }], used, aro.COD.f(...vs), live).filter(x=> !vs.includes(x))

    } else if (t.$ == "APP"){
      let REC = searchStack(cs, t.fn)
      let aro = asTag(t.fn.ty, "Arrow")
      used = checkSig(t.args, aro.DOM)
      checkEQ(type, aro.COD.f(...t.args))
      if (REC){
        for (let i = 0; i < REC.args.length; i++){
          let A = REC.args[i]
          let a = t.args[i]
          if (A.$ == "adt" && A.srcs.some(el => el == a)) break
          if (A != a || i == REC.args.length - 1) raise(`Non well-founded application detected: ${fmt(a)}\nrecursive arguments are checked from left and must match until some argument decreases`)
        }
      }
      else return go(t.fn, cs, used, aro, live)

    } else if (t.$ == "Arrow"){ if (type == Data) raise(`Cannot construct Arrow of type Data`)

    } else if (t.$ == "ADT"){
      if (type == Data)
        for(let v of t.variants)
          for (let s of fillSign(v))
            if (s.ty.ty != Data) raise(`Cannot construct Data from non-Data type: ${fmt(s.ty)}`)
    }
    return used

  }
  go(t, [], [], undefined, true)
  checked.add(t)
}

function adt(ty: Term, tag: number, ...srcs: Term[]): adt{
  return { $: "adt", ty, tag, srcs }
}


function $(fn: Term, ...args: Term[]): APP{
  let ty = fn.ty == Hole ? Hole : asTag(fn.ty, "Arrow").COD.f(...args)

  return { $: "APP", ty, fn, args }
}

function match(scr: Term, srcs: F[]): match{

  let ty: match = {$: "match", ty: Type, scr, srcs: srcs.map((f,i)=>({...f, f: (...vs:Term[]) => f.f(...vs).ty} as F))}
  let res : match = { $: "match", ty, scr, srcs }
  return res
}

type synt = string | synt []

function parse (input: string): synt{
  let idx = 0
  let toks: string[] = []
  function parseSym(): true | undefined {
    for (let s of [ "(", ")", ":", "->", "=>", ",", "|", "-", "+" ]){
      if (input.startsWith(s, idx)){
        idx += s.length
        push()
        toks.push(s)
        return true
      }
    }
  }
  let word = ""
  function push(){
    if (!word) return
    toks.push(word)
    word = ""
  }
  while(idx < input.length){
    while([" ", "\t", "\n", "\r"].includes(input[idx])){
      push()
      idx++
    }
    if (parseSym()) continue
    if (idx < input.length) word += input[idx++]
  }
  push()
  idx = 0
  function go(): synt{
    if (toks[idx] !== "(") return toks[idx++]
    idx++
    let res: synt[] = []
    while (toks[idx] !== ")"){
      if (idx >= toks.length) raise(`unexpected end of input while parsing list`)
      res.push(go())
    }
    idx++
    return res
  }
  return go()
}


function compile(s: string) : Term{
  let tr = parse(s);

  function asIden(tr: synt): string{

    if (typeof tr != "string") raise(`expected an identifier, but got: ${JSON.stringify(tr)}`)
    return tr
  }

  type Ctx = string[]


  type annot = {name: string, ty: string, live: boolean}

  function asAnnot (tr: synt, ctx: Ctx): annot{
    let live = true
    if (tr[0] == "-") {
      live = false;
      tr = tr.slice(1)
    }

    if (!Array.isArray(tr) || tr.length < 3 || tr[1] != ":") raise(`expected an annotation of the form [expr, ":", type], but got: ${JSON.stringify(tr)}`)
    let [v,,t] = tr
    if (typeof v != "string") raise(`expected an identifier for the variable name, but got: ${JSON.stringify(v)}`)
    return {name: v, ty: goTerm(t, ctx), live}
  }

  function asSign(tr: synt, ctx: Ctx): annot[]{
    if (!Array.isArray(tr)) raise(`expected a list of annotations, but got: ${JSON.stringify(tr)}`)
    let anns: annot[] = []
    for (let x of splitList(tr, ",")) anns.push(asAnnot(x, ctx.concat(anns.map(a => a.name))))
    return anns
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

  function goTerm(tr: synt, ctx: Ctx, ty?: string): string{

    if (typeof tr == "string") {
      if (tr == "sorry") return `book.get("sorry")`
      if (!ctx.includes(tr)) {
        if (book.has(tr)) return `book.get("${tr}")`
        raise(`unbound identifier: ${tr}`)}
      return tr
    }

  
    if (Array.isArray(tr)) {
      if (tr[0] == "match") {
        return `({
          $: "match",
          scr: ${goTerm(tr[1], ctx)},
          ty: book.get("Hole"),
          srcs: [${splitList(tr, "|").slice(1).map(arm => {
            let [pat, expr] = splitList(arm, "=>")
            if (typeof pat == "string") pat = [pat]
            for (let p of pat) if (typeof p != "string") raise(`expected a string in the pattern, but got: ${JSON.stringify(p)}`)
            return `{length: ${pat.length}, names: [${pat.map(x=>`"${x}"`)}], f: (${pat.join(", ")})=>${goTerm(expr, [...ctx, ...pat as string[]])}}`
          }).join(", ")}]
        })`
      }

      if (tr[0] == "|"){
        let args = splitList(tr.slice(1), "|").map(x=> asSign(x[0], ctx))
        return [
          `({`,
          `  $: "ADT",`,
          `  ty: book.get("Type"),`,
          `  variants: [${args.map(vr => mkSign(vr)).join(", ")}]`,
          `})`
        ].join("\n")
      }

      if (tr[1] == "->"){
        let dom = asSign(tr[0], ctx)
        return `({ty: book.get("Type"), $: "Arrow", DOM: ${mkSign(dom)}, COD: ${mkF(dom, goTerm(tr.slice(2), ctx.concat(dom.map(a=>a.name))))} })`
      }

      if (tr.includes("=>")){
        let args = asSign(tr[0], ctx)
        if (tr[1]!=":") raise(`expected a ":" after the argument list in the lambda, but got: ${JSON.stringify(tr[1])}`)
        let R = goTerm(tr[2], ctx.concat(args.map(a => a.name)))
        if (tr[3] != "=>") raise(`expected a "=>" after the return type in the lambda, but got: ${JSON.stringify(tr[3])}`)
        let B = goTerm(tr.slice(4), ctx.concat(args.map(a=>a.name)), R)
        return mkLam(args, R, B)
      }

      if (Array.isArray(tr[0]) && tr[0].includes("=")){
        let letr = tr[0]
        let vname = asIden(letr[0])
        if (letr[1] != ":") raise(`expected a ":" after the let binding, but got: ${JSON.stringify(tr[1])}`)
        let vtype = goTerm(letr[2], ctx)
        if (letr[3] != "=") raise(`expected a "=" after the type annotation in the let binding, but got: ${JSON.stringify(tr[3])}`)
        return `(${vname} => ${goTerm(tr.slice(1), ctx.concat([vname]))})(${ goTerm(letr[4], ctx, vtype)})`
      }

      if (typeof tr[0] == "string" && tr[0].startsWith("#")){
        let idx = parseInt(tr[0].slice(1))
        if (isNaN(idx)) raise(`expected a numeric index after "#", but got: ${tr[0].slice(1)}`)
        let args = tr.slice(1).map(x=>goTerm(x, ctx))
        if (ty == undefined) raise(`expected a type for the contructor`)
        return `{$:"adt", tag: ${idx}, srcs: [${args.join(", ")}], ty: ${ty}}`
      }

      if (tr.length == 1) return goTerm(tr[0], ctx, ty)
      return `$( ${tr.map(x=>goTerm(x, ctx)).join(", ")} )`
    }
    raise(`expected a term, but got: ${JSON.stringify(tr)}`)
  }

  function mkSign(args: annot[]): string{return mkF(args, `[${args.map(a=>a.ty)}]`)}

  function mkF(args: annot[], bod: string): string{
    return `({ slots: [${args.map(a=> `{name: "${a.name}", live: ${a.live}}`).join(", ")}], f: ${`((${args.map(a=>a.name).join(", ")})=>${bod})`} })`
  }


  function mkLam(args: annot[], R: string, bod: string) : string {
    return [
      `({`,
      `  $: "Lam",`,
      `  name: "${name}",`,
      `  ty: {`,
      `    $: "Arrow",`,
      `    DOM: ${mkSign(args)},`,
      `    COD: { length: ${args.length}, f: (${args.map(a=>a.name)})=> (${R}) } },`,
      `  fn: { length: ${args.length}, f: (${args.map(a=>a.name)})=> (${bod}) }`,
      `})`
    ].join("\n");
  }

  let ctx :Ctx = []
  let obj = {} as Term
  if (typeof tr == "string") raise(`unexpected string term at top level: ${tr}`)

  let name = asIden(tr[0])

  let code : string
  if (Array.isArray(tr[1])){
    book.set(name, obj)
    if (tr[2] != ":") raise(`expected a ":" after the argument list, but got: ${JSON.stringify(tr[2])}`)
    if (tr[4] != "=") raise(`expected a "=" after the return type, but got: ${JSON.stringify(tr[4])}`)
    let args = asSign(tr[1], ctx)
    ctx = ctx.concat(args.map(a=>a.name))
    let R =  goTerm(tr[3], ctx)
    code = mkLam(args, R, goTerm(tr.slice(5), ctx, R))
  } else if (tr[1] == ":"){
    let ty = goTerm(tr[2], ctx)
    if (tr[2] == "Type" || tr[2] == "Data") book.set(name,obj)
    code = `({...${goTerm(tr.slice(4), ctx, ty)}, ty: ${ty} })`
  }else raise(`unexpected syntactic form: ${JSON.stringify(tr)}`)
  let Ctx = { match, book, $, obj, }
  try{
    Function(...Object.keys(Ctx),"check", `Object.assign(obj, ${code})`)(...Object.values(Ctx), check)
  }catch(e){
    book.delete(name)
    raise(`Error during compilation of ${name}: ${e}\nCode that caused the error: ${code}`)
  }
  book.set(name,obj)
  check(obj)
  store(obj, name)
  return obj
}

function decline(s: string){
  try{ compile(s)}
  catch(e){return}
  raise(`expected compilation to fail for: ${s}`)
}

compile("(NULL : Data = | () )")
compile("(Null : NULL = (#0 ) )")

compile("(BOOL : Data = | () | () )")
compile("(True : BOOL = (#1 ) )")
compile("(False : BOOL = (#0 ) )")

compile("(_f (x:Type) : Type = x)")
compile("(_f (x:BOOL) : BOOL = match x | => x | => x)")
compile("(_f (x:BOOL) : BOOL = match x | => True | => False)")
decline("(_f (x:BOOL) : BOOL = match x | => True | => NULL)")
decline("(_f (x:BOOL) : BOOL = match x | => NULL | => True)")

compile("(TF (x:BOOL) : Type = match x | => NULL | => BOOL)")
compile("(_tfm (x:BOOL) : (TF x) = match x | => Null | => True)")

compile("(SIG : Type = | (w: BOOL, y: (TF w) ) )")
compile("(_sig1 : SIG = (#0 True True) ) ")
decline("(_sig2 : SIG = (#0 True) )")
decline("(_sig2 : SIG = (#0 True Null) )")
decline("(_sig2 : SIG = (#0 False True) )")
compile("(_sig2 : SIG = (#0 False Null) )")

compile("(WRP (T: Type): Type = | (x: T) )")
compile("(_wrpB : (WRP BOOL) = (#0 True) )")
decline("(_wrpB : (WRP NULL) = (#0 True) )")

let Nat  = compile("(Nat: Data = | () | (p: Nat) )")
let Zero = compile("(Zero : Nat = (#0 ) )")
let Succ = compile("(S (n: Nat) : Nat = (#1 n) )")
let pred = compile("(pred (n: Nat) : Nat = match n | => Zero | p => p )")

// compileFN("( ppef : (EQ Nat Zero Zero) )")

let eater = compile("(eater (n: Nat): Nat = match n | => Zero | p => (eater p) )")
let n0 =    compile("(n0 : Nat = Zero)")
let n1 =    compile("(n1 : Nat = (S Zero) )")
let n2 =    compile("(n2 : Nat = (S (S Zero ))  )")
let aro =   compile("(aro : Type = (x: Nat) -> Nat )")

decline("(NDT : Nat = Type)")
decline("(DID : Data = Type)")
compile("(TID : Data = Nat)")
compile("(DID : Type = Type)")
compile("(_uu : aro = pred )")

compile( `( _oneof (n: Nat) : (| ( x : Nat )  | ( y : BOOL ) ) = (#0 n) ) ` )
decline( `( _oneof (n: Nat) : (| ( x : Nat )  | ( y : BOOL ) ) = (#1 n) ) ` )

compile( `( _typeid (T: Type) :Type = T)`)
compile( `( _dataid (T: Data) :Data = T)`)
decline( `( _typeup (T: Type) :Data = T)`)
compile( `( _dataup (T: Data) :Type = T)`)

compile( `( _intersection (t: Data, x: t) : (|(a: t, b: t)) = (#0 x x))`)
decline( `( _notaffine (t: Type, x: t) : (|(a: t, b: t)) = (#0 x x))`)


/**
 * Equality is defined as proof of (P a) -> (P b) for all P, a, b
 * this is one way, symmetry can be derived
 * rfl is an AXIOM, saying for all x : x == x
 */

let EQ  = compile("(EQ (-T: Type, -a: T, -b: T) : Type = (P: ( (x:T)->Type), h: (P a) ) ->  (P b) )")
let RFL = compile("(RFL: Type = (-T: Type, -x: T) -> (EQ T x x) )")
rfl.ty = RFL


compile("(_pp : (EQ  Nat (pred n1) Zero ) = (rfl Nat Zero) ) ")
compile("(_ppe : (EQ  Nat (eater n2) Zero ) = (rfl Nat Zero) ) ")
decline("(_ppne : (EQ  Nat (pred n2) Zero ) = (rfl Nat Zero) )")

compile(`(pr0 (n: Nat ) : (EQ Nat Zero Zero) =  match n | => (rfl Nat n) | p => (rfl Nat Zero) ) `)

compile (" (NPred : Type = (n: Nat) -> Type )")

compile(`(_f (n: Nat, P:NPred, h: ((x: Nat) -> (P x))) : (P n) =  (h n) ) `)
decline(`(_f (n: Nat, P:NPred, h: ((x: Nat) -> (P x))) : (P n) =  (h Zero) ) `)

compile(`(_f (n: Nat, P:NPred, h: ((x: Nat) -> (P x))) : (P n) = match n | => (h n) | p => (h n) ) `)
decline(`(_f (n: Nat, P:NPred, h: ((x: Nat) -> (P x))) : (P n) = match n | => (h n) | p => (h p) ) `)

compile(`(isZ (n: Nat) : Type = (EQ Nat Zero n))`)
compile("(_p (n: Nat) : Type = (isZ (eater n))) ")

compile("(eater_n_eq (n: Nat): (EQ Nat (eater n) (eater (S n)) ) = (rfl Nat (eater n)) )")

decline("(_p (n: Nat): (EQ Nat (eater n) (eater (S n)) ) = (rfl Nat (pred n)) )")
decline("(_p (n: Nat): (EQ Nat Zero n1) = (rfl Nat Zero)")
compile(`(_p (n: Nat ) : ( EQ Nat (eater n) (eater (S n) ) ) = ( eater_n_eq n ) )`)

compile(`(eater_0 (n: Nat) : (isZ (eater n)) =  match n | => (rfl Nat Zero) | p => ((eater_n_eq p) isZ (eater_0 p)) )`)

compile(`(_cloj (x: Nat) : Nat = (y : Nat = Zero) y)`)
compile(`(_cloj2 : ((x:Nat) -> Nat ) = (x: Nat): Nat => x)`)

compile(`( EQ.tran (T: Type, a: T, b: T, c: T, e1: (EQ T a b), e2: (EQ T b c)) : (EQ T a c) = (e2 ((x: T) : Type => (EQ T a x)) e1) )`)

compile(`(_use2T (T: Type) : Type = (x: T) -> T)`)

decline(`(_use2T (T: Type, P: ((a:Type, b: Type)-> Type ) ) : Type = (P T T))`)
decline(`(_use2T (-T: Type, P: ((a:Type, b: Type)-> Type ) ) : Type = (P T T))`)

compile(`(_use2Nat (x: Nat, P: ((a: Nat, b: Nat) -> Type)) : Type = (P x x))`)
decline(`( _death (-x:Nat) : Nat = x)`)

compile(`(N2N : Type = ((x:Nat) -> Nat))`)
decline(`(_aroData : Data = ((x:Nat) -> Nat))`)

decline(`(eAdt : Data = | (x: N2N))`)
compile(`(tAdt : Type = | (x: N2N))`)
compile(`(_gAdt : Data = | (x: Nat))`)

decline(`(_use2tadt (x: tAdt) : (| (x: tAdt, y: tAdt))  = (#0 x x))`)
compile(`(_use2tadt (x: tAdt) : (| (x: tAdt, y: Nat))  = (#0 x n0))`)

compile(`(_usedeadT (-T: Type, x: T) : T = x)`)

compile(`(_calluseT (x:Nat): Nat = (_usedeadT Nat x))`)
decline(`(_calluseT (x:Nat): Nat = (_usedeadT BOOL x))`)


compile(`(_passDead(-T: Type, -x:T, f: ((-x:T)->T) ) : T = (f x) )`)

compile(`(_erlf (-T: Type, x: T) : (EQ T x x) = (rfl T  x))`)


compile(`( Empty : Type = | )`)
compile(`( K : Type = (-x: K) -> Empty)`)
compile(`( Kp (xt: K) : Empty = (xt xt) )`)

decline(`( ep: Empty = (Kp Kp) )`)
decline(`( Kp (-xt: K) : Empty = (xt xt) )`)

compile(`( Kl  : Type = (x: Kl) -> Empty)`)
decline(`( Klp (xt: Kl)  : Empty = (xt xt))`)
decline(`( Klp (-xt: Kl) : Empty = (xt xt))`)
compile(`( Klp (xt: Kl) : Kl = xt)`)
compile(`( Klp (xt: Kl, yt: Kl) : Empty = (xt yt))`)
decline(`( Klp (xt: Kl, -yt: Kl) : Empty = (xt yt))`)

compile(`( EQ.symm (-T: Type, a: T, b: T, e: (EQ T a b)) : (EQ T b a) =
  (e
    ((x: T) : Type => (EQ T x a))
    (rfl T a)
  )
)`)


compile(`( + (n: Nat, m: Nat) : Nat =
  match n
    | => m
    | p => (S (+ p m))
)`)


compile(`(== (n: Nat, m: Nat) : Type = (EQ Nat n m))`)

compile( `(
  congruence (
    T: Type,
    U : Type,
    a: T,
    b: T,
    f: ((x:T) -> U),
    e: (EQ T a b)
  ) : (EQ U (f a) (f b))
  =
  (e
    ((x: T) : Type => (EQ U (f a) (f x)))
    (rfl U (f a))
  )
)`)

compile(`( add.succ.0 (n: Nat, k: Nat) : (== (+ (S n) k) (S (+ n k) )) = (rfl Nat (+ (S n) k)) )`)
compile(`( add.0.step (n: Nat, h: (== (+ n n0) n) )
  : (==  (+ (S n) n0) (S n) )
  = (congruence Nat Nat (+ n n0) n S h)
)`)

compile(`( add.0 (n: Nat) : (== (+ n n0) n) =
  match n
    | => (rfl Nat n0)
    | p => (add.0.step p (add.0 p) )
)`)

compile(`( add.0.symm (n: Nat) : (== n (+ n n0)) = ( EQ.symm Nat (+ n n0) n (add.0 n) ) )`)
compile(`(add.succ.p (n: Nat) : (== (S n) (+ n n1)) = match n
  | => (rfl Nat n1)
  | p =>(congruence Nat Nat (S p) (+ p n1) S (add.succ.p p))  )`)

compile(`( add.succ (n: Nat, m: Nat) : (== (S (+ n m)) (+ n (S m)) ) =
  match n
    | => (rfl Nat (S m))
    | p => (congruence Nat Nat (S (+ p m)) (+ p (S m)) S (add.succ p m))
)`)

compile(`( add.comm (n: Nat, m: Nat) : (== (+ n m) (+ m n)) =
  match n
    | => (add.0.symm m)
    | p => (EQ.tran Nat
        (S (+ p m))
        (S (+ m p))
        (+ m (S p))
        (congruence Nat Nat (+ p m) (+ m p) S (add.comm p m))
        (add.succ m p))
)`)


compile(`( AND (A: Type, B: Type) : Type  = | (a: A, b: B))`)

compile(`( _f (T: Type, P: ((x:Type) -> Type), a: (P T) ) : (P T) = a )`)

compile(`(
  BadM (m: Nat) : Type =
    match m
      | => NULL
      | q => Empty
)`)

compile(`(
  BadTy (n: Nat, m: Nat) : Type =
    match n
      | => (BadM m)
      | p => Empty
)`)

decline(`(
  badRec (n: Nat, m: Nat) : (BadTy n m) =
    match n
      | => (
          match m
            | => Null
            | q => (badRec (S q) q)
        )
      | p => (
          match p
            | => (badRec p (S p))
            | r => (badRec p (S p))
        )
)`)

decline(`(_badbad : Empty = _badbad)`)



compile(`(Fam (n: Nat) : Type = NULL)`)

compile(`(
  witness (n: Nat) : (Fam n) =
    Null
)`)

compile(`(Fam (n: Nat) : Type = Empty)`)

compile(`(
  emptyRebind : Empty =
    (witness Zero)
)`)