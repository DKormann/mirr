


// type Type    = { $: "type", srcs: [], ty: Term}                      // a type

// type Arrow   = { $: "arrow", srcs: [Term, Term], ty: Term } // a type
// type Union   = { $: "union", srcs: Term[] , ty:Term}                 // a type
// type Intersect = { $: "intersect", srcs: Term[] , ty: Term }         // a type

// type tuple   = { $: "tuple", srcs: Term[], ty: Term }               // a intersect
// type choice  = { $: "choice", tag: number, srcs: [Term] , ty: Term }  // a union

// type cotuple = { $: "cotuple", tag: number, srcs: [Term], ty: Term }
// type cochoice = { $: "cochoice", srcs: Term[], ty: Term }

// type appl    = { $: "app", srcs: [Term, Term] ,ty: Term };
// type ref     = { $: "ref", slot: number, srcs: [], ty: Term };
// type def     = { $: "def", name: string, ty: Term, bod: Term }



// type Term = Union | Intersect | choice | Arrow | tuple | appl | ref | Type | def | cotuple | cochoice

// const Type : Type = { $: "type", srcs: [] } as Type
// Type.ty = Type


// const Union = (...srcs: Term[]): Union => ({ $: "union", srcs, ty: Type });
// const Intersect = (...srcs: Term[]): Intersect => ({ $: "intersect", srcs, ty: Type });

// function sizeof(t:Term):number{
//   if (t.ty != Type) raise(`Expected type to be Type, got ${t.ty.$}`);
//   if (t.$ === "intersect") return t.srcs.length
//   return 1
// }

// const Arrow = (srcs: [Term, Term]): Arrow => ({ $: "arrow", srcs, ty: Type });

// const tuple = (srcs: Term[], ty: Term): tuple => ({ $: "tuple", srcs, ty });
// const choice = (tag: number, src: Term, ty: Term): choice => ({ $: "choice", tag, srcs: [src], ty });

// const cotuple = (tag: number, src: Term, ty: Term): cotuple => ({ $: "cotuple", tag, srcs: [src], ty });
// const cochoice = (srcs: Term[], ty: Term): cochoice => ({ $: "cochoice", srcs, ty });

// const appl = (srcs: [ Term , Term], ty: Term): appl => ({ $: "app", srcs, ty});
// const ref = (slot: number, ty: Term): ref => ({ $: "ref", slot, srcs: [], ty });
// const def = (name: string, ty: Term, bod: Term): def => ({ $: "def", name, ty, bod });


// function clone(t: def, G: G): Term{

//   function go(t: Term, G: G): Term{
//     switch(t.$){
//       case "def": return t
//       case "ref": return {...t, slot : t.slot + G.length, ty: go(t.ty, G)}
//       default: return {...t, srcs: t.srcs.map(s => go(s, G)), ty: go(t.ty, G)} as Term
//     }
//   }
//   return go(t.bod, G)
// }



// let seen = new Set<def>();

// function fmt(t:Term, d:number =0): string{


//   let res = ''

//   function go(t:Term, d: number= 0): string{
//     switch(t.$){
//       case "type":  return "Type";
//       case "arrow": return `(${go(t.srcs[0])} -> ${go(t.srcs[1])})`;
//       case "intersect": return `{${t.srcs.map(s => go(s)).join(" ∧ ")}}`;
//       case "union": return `(${t.srcs.map(s => go(s)).join(" ∨ ")})`;

//       case "tuple": case "cochoice": return `{${t.srcs.map(s => go(s)).join(", ")}} : ${go(t.ty)}`;
//       case "choice": case "cotuple": return `#${t.tag}(${go(t.srcs[0])}) : ${go(t.ty)}`;

//       case "app": return `(${go(t.srcs[0])} ${go(t.srcs[1])})`;
//       case "ref": return `x${t.slot}`
      
//       case "def":
//         if (!seen.has(t)){
//           let k = `def ${t.name} : ${go(t.ty)} = ${go(t.bod)}\n`;
//           res += k;
//           seen.add(t);
//         }
//         return t.name
//     }
//   }

//   let k = go(t)
//   return res + k
// }



// let NULL = def ("NULL", Type, Intersect())
// let Null = def ("Null", NULL, tuple([], NULL))

// console.log(fmt(Null))
// let BOOL = def("BOOL", Type, Union(Intersect(), Intersect()))

// let TRU = def("TRU", BOOL, choice(0, tuple([], NULL), BOOL))
// let FAL = def("FAL", BOOL, choice(1, tuple([], NULL), BOOL))

// console.log(fmt(TRU))

// type TC = Term[]
// type G = (Term | null)[]


// function runTerm (t:Term, G: G): Term{
//   switch(t.$){
//     case "ref":
//       return G[t.slot] ?? t;
//     case "def": return t
//     default: 
//       return {...t, srcs: t.srcs.map(s=>runTerm(s, G))} as Term
//   }
// }


// function raise(msg: string):never{
//   throw new Error(msg);
// }


// function runCochoice(fn: cochoice, arg: choice, G: G): Term{

//   G = [...G,...arg.srcs]
//   let bod = fn.srcs[arg.tag]
//   return runTerm(bod, G)
// }

// function runCotuple(fn: cotuple, arg: tuple, G: G): Term{
//   G = [...G,...arg.srcs]
//   if (fn.tag !== arg.srcs.length) raise(`Expected ${fn.tag} arguments, got ${arg.srcs.length}`);
//   let bod = fn.srcs[0]
//   return runTerm(bod, G)
// }

// function runFunc(fn: Term, arg:Term, G: G): Term{
//   let a = fn.ty
//   if (a.$ !== "arrow") raise(`Expected arrow type, got ${a.$}`);
//   unify(a.srcs[0], arg.ty, G);

//   fn = whnf(fn, G)
//   let oldG = G

//   if (fn.$ == "def") fn = clone(fn, G)

//   if (fn.$ === "cochoice"){
//     arg = whnf(arg,oldG)
//     if (arg.$ == "choice") return runCochoice(fn, arg, G)
//   } else if (fn.$ === "cotuple"){
//     arg = whnf(arg, oldG)
//     if (arg.$ == "tuple") return runCotuple(fn, arg, G)
//   } else if (fn.$ ==="ref"){

//   } else {
//     return runTerm(fn, [...G, arg])
//   }
//   raise(`Cannot apply function of type ${fn.$} to argument of type ${arg.$}`);

// }

// function whnf(t:Term, G: G): Term{
//   switch (t.$){
//     case "ref":
//       if (t.slot >= G.length) raise(`Reference out of bounds: ${t.slot} >= ${G.length}`);
//       return G[t.slot] ?? t;
//     case "app":
//       let [f, x] = t.srcs;
//       let a = f.ty
//       if (a.$ !== "arrow") raise(`Expected arrow type, got ${a.$}`);
//       return runFunc(f, x, G)
//     default:
//       return t;
//   }
// }

// function unify(a:Term, b:Term, G: G): void{
//   if (a == b) return
//   a = whnf(a, G)
//   b = whnf(b, G)
  
//   if (a.$ != b.$){
//     if (a.$ == "def") unify()
//     raise(`Cannot unify terms of different types: ${fmt(a)} vs ${fmt(b)}`);
//   }
//   if ("slot" in a && "slot" in b && a.slot != b.slot) raise(`Cannot unify different references: ${a.slot} vs ${b.slot}`);
//   if (a.$ === "def") raise(`Cannot unify defs`);
//   if (b.$ === "def") raise(`Cannot unify defs`);
//   a.srcs.forEach((src, i) => unify(src, b.srcs[i], G));
// }



// let checked = new Set<def>();
// function checkTerm(t:Term, TC: TC = [], G: G = []){
//   let ty = t.ty
//   if (ty.ty !== Type) raise(`Expected type, got ${fmt(ty)}`);
//   while (ty.$ == "def") ty = clone(ty, G)

//   switch(t.$){
//     case "ref":
//       if (t.slot >= TC.length) raise(`Reference out of bounds in type context: ${t.slot} >= ${TC.length}`);
//       unify(t.ty, TC[t.slot], G)
//       break;
//     case "app":{
//       let [f, x] = t.srcs;
//       let F = f.ty
//       let X = x.ty
//       if (F.$ !== "arrow") raise(`Expected arrow type for function, got ${F.$}`);
//       unify(F.srcs[0], X, G)
//       // unify(t.ty, runArrow(F, X, G), G)
//       break
//     }
//     case "type":
//     case "arrow":
//     case "union":
//     case "intersect":{
//       unify(t.ty, Type, G)
//       t.srcs.forEach(src => unify(src.ty, Type, G))
//       break
//     }
//     case "choice":{
//       if (ty.$ !== "union") raise(`Expected union type for choice, got ${t.ty.$}`)
//       unify(t.srcs[0].ty, ty.srcs[t.tag], G)
//       break;
//     }
//     case "tuple":{
//       if (ty.$ !== "intersect") raise(`Expected intersect type for tuple, got ${t.ty.$}`)
//       if (ty.srcs.length != t.srcs.length) raise(`Expected ${ty.srcs.length} elements in tuple, got ${t.srcs.length}`);
//       break
//     }
//     case "def":{
//       if (checked.has(t)) return
//       checked.add(t)
//       unify(t.ty, t.bod.ty, [])
//       checkTerm(t.bod, [], [])
//       checkTerm(t.ty, [], [])
//       return
//     }
//     case "cochoice":{
//       return
//     }
//     case "cotuple":{
//       return
//     }
//   }
//   t.srcs.forEach(s=>checkTerm(s, TC, G))
// }


// function checkBadT(t: Term){

//   try{
//     checkTerm(t)
//   }catch(e){return}

//   raise(`Term did not fail type checking : ${fmt(t)}`);

// }

// checkTerm(BOOL)
// checkBadT({...BOOL, ty: NULL})
// checkBadT({...TRU, ty: NULL})

// checkTerm({...TRU, ty: BOOL})