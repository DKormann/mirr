import { raise } from "./hoas.4.bigStruct"


export type synt = string | synt []


export function parse (input: string): synt{
  let idx = 0
  let toks: string[] = []
  function parseSym(): true | undefined {
    for (let s of [ "(", ")", ":", "->", "=>", ",", "|" ]){
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


