


import {SYM, type Term, Type, fmt, raise, show} from "./hoas.4.bigStruct"



import {mktree, synt} from "./lisp"


function compile(s: string) : string{
  let tr = mktree(s);

  function asIden(tr: synt, c: Ctx): Term{
    if (typeof tr != "string") raise(`expected an identifier, but got: ${JSON.stringify(tr)}`)
    let r = c[tr]
    if (r === undefined) raise(`unbound identifier: ${tr}`)
    return r
  }

  type Ctx= Record<string, Term>
  function asAnnot (tr: synt, c: Ctx): [string, Term]{
    if (!Array.isArray(tr) || tr.length < 3 || tr[1] != ":") raise(`expected an annotation of the form [expr, ":", type], but got: ${JSON.stringify(tr)}`)
    let [v,,t] = tr
    if (typeof v != "string") raise(`expected an identifier for the variable name, but got: ${JSON.stringify(v)}`)
    return [v, mkTerm(t, c)]
  }

  function mkTerm(s: synt, ctx: Record<string, Term>):Term{
    if (typeof s == "string") {
      if (ctx[s] === undefined) raise(`unbound variable: ${s}`)
      return ctx[s]
    }
    raise(`expected a term, but got: ${JSON.stringify(s)}`)

  }

  let base = {
    Type: Type
  }

  function go(tr: synt){
    if (typeof tr == "string") {
    }else{
      let name = asIden(tr[0])
      if (Array.isArray(tr[1])){
        console.log({name})
        let colIdx = tr.findIndex(x=> x == ":")
        let eqIdx = tr.findIndex(x=> x == "=")
        if (colIdx == -1) raise(`expected a ":" in the function declaration, but got: ${JSON.stringify(tr)}`)
        if (eqIdx == -1) raise(`expected a "=" in the function declaration, but got: ${JSON.stringify(tr)}`)
        let args = tr.slice(2, colIdx).map(x=>asAnnot(x, base))
 
      }
    }
  }


  let res = go(tr)

  show(res ?? "")
}




compile("(f (x:Type) : Type = x)")

