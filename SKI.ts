

type T = "S" | "K" | T[]| string | ((x: T) => T)

let DEBUG = true




function debug(...t: any[]): void {
  if (DEBUG) console.log(t.map(x=>fmt(x)).join(" "))
}



function whnf(t: T): T{

  if (typeof t == "string") return t
  if (typeof t == "function") return t
  let [f, ...args] = t
  f = whnf(f)
  if (typeof f == "function" && args.length > 0) return whnf([f(args[0]), ...args.slice(1)])
  if (Array.isArray(f)) return whnf([...f, ...args])
  if (f == "K" && args.length >= 2) return whnf([args[0], ...args.slice(1)])
  if (f == "S" && args.length >= 3) return whnf([[args[0], args[2]], [args[1], args[2]], ...args.slice(3)])
  return [f, ...args]
}

function run(t: T):T{
  if (typeof t == "string" || typeof t == "function") return t
  let [f, ...args] = t
  if (typeof f == "function" && args.length > 0) return run([f(args[0]), ...args.slice(1)])
  if (Array.isArray(f)) return run([...f, ...args])
  if (f == "K" && args.length >= 2) {
    return run([args[0], ...args.slice(2)])
  }
  if (f == "S" && args.length >= 3) {
    return run( [[args[0], args[2]], [args[1], args[2]], ...args.slice(3)])
  }
  if (args.length == 0) return f
  return [f, ...args.map(run)]
}


let book = new Map<string, string>()

function store(t: T, name: string){
  t = whnf(t)
  book.set(fmt(t), name)
  return t
}


function fmt(t:T, h? : boolean):string{

  if (typeof t == "string") return t

  if (typeof t == "function") return t.toString() // or some appropriate string representation  
  let r = `[${t.map((x,i)=>fmt(x, i == 0)).join(" ")}]`

  return h ? r.slice(1, -1) : r
  
}


let True = store("K", "True")
let False = store(["S", "K"], "False")
let I = store([False, "K"], "I")

let S = "S"
let K = "K"




debug(run([I, "e"]))



/**
 * lam x . lam y . x
 * lam x . K x
 * S (lam x . K) (lam x . x)
 * S (K K) I
 * 
 * lam x . lam y . lam z . x
 * lam x . lam y . K x
 * lam x . K (K x)
 * S (lam x . K) (lam x . K x)
 * S (K K) (S (lam x. K) (lam x. x))
 * S KK (S KK I)
 */

let KK = store(["K", "K"], "KK")

let x0f3 = store([[S, KK], [[S, KK], I]], "x0f3")

debug(run([x0f3, "a", "b", "c"]))

let xof4 = store(([S, KK, x0f3]), "xof4")

debug(run([xof4, "a", "b", "c", "d"]))


/**
 * 
 * 
 * lam a b c d . (b d)
 * lam a b c . S (lam d . b) (lam d. d)
 * lam a b c . S (K b) I
 * lam a b . K (S (K b) I)
 * lam a . S (lam b . K) (lam b . S (K b) I)
 * lam a . S KK (S (lam b . (S (K b)) lam b . I))
 * lam a . S KK (S (S (lam b . S) (lam b . K b)) KI)
 * lam a . S KK (S (S KS) (S (lam b . K) (lam b. b)) KI)
 * lam a . S KK (S (S KS) (S KK I) KI)
 * K (S KK (S (S KS) (S KK I) KI))
 * 
 */


/**
 * lam a b c . (a c)
 * lam a b . S (lam c . a) (lam c . c)
 * lam a b . S Ka I
 * lam a . K (S Ka I)
 * S (lam a. K) (lam a. (S Ka I))
 * S KK (lam a. (S Ka I))
 * S KK (S (lam a . S) (lam a. (Ka I)))
 * S KK (S KS (lam a. (Ka I)))
 * S KK (S KS (S (lam a .Ka) KI))
 * S KK (S KS (S (S (KK) I) KI))
 * 
 */

/**
 * lam a b c . (a c)
 * lam a b . a
 * lam a . K a
 * K
 */




let KS = store([K, S], "KS")
let KI = store([K, I], "KI")

/**
 * lam a b . (b a)
 * lam a . SI (K a)
 * S (K SI) K
 */


debug("--")
let acof3 = store(([S, KK, [S, KS, [S, [S , KK], I], KI]]), "acof3")
debug(run(acof3))
debug("---")

/**
 * B := lam f g x . f (g x)
 * lam f g x . f (g x)
 * lam f g . S (K f) g
 * lam f . S (K f)
 * S KS K
 */

let B = store(([S, [K, S], K]), "B")
debug(run([B, "f", "g", "x"]))

/**
 * C := lam f x y . f y x
 * = lam f x . S f (K x)
 * = lam f . S (K (S f)) K
 * = S (S KS (S KK S)) KK
 */




let C : T = [S, [S, KS, [S, KK, S]], KK]

debug(run([C, "f", "x", "y"]))


debug("****")



