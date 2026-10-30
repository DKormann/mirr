

export type synt = string | synt []

let symbols = [ "(", ")", ":", "->", "=>", ",", "|" ]

function tokenize(input: string): string[]{
  let idx = 0
  let toks: string[] = []
  function parseSym():true| undefined{
    for (let s of symbols){
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
    while(input[idx] == ' ') {
      push()
      idx++
    }
    if (parseSym()) continue
    if (idx < input.length) word += input[idx++]
  }
  push()
  return toks
}

export function mktree (input: string): synt{
  let toks = tokenize(input)
  let idx = 0

  function go(): synt{
    if (toks[idx] !== "(") return toks[idx++]
    idx++
    let res: synt[] = []
    while (toks[idx] !== ")"){
      res.push(go())
    }
    idx++
    return res
  }
  return go()
}


