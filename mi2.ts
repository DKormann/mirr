


// type TT = {ty: Term, name? : string}

// type Type = { $: "type", srcs: []} & TT
// type arw = { $: "arrow", srcs: [Term, Term]} & TT
// type CHC = { $: "CHOICE", srcs: Term[]} & TT
// type TUP = { $: "TUPLE", srcs: Term[] } & TT
// type tup = { $: "tuple", srcs: Term[]} & TT
// type chc = { $: "choice", tag: number, srcs: [Term] } & TT
// type ctu = { $: "cotuple", tag: number, srcs: [Term]} & TT
// type cch = { $: "cochoice", srcs: Term[]} & TT
// type app = { $: "app", srcs: [Term, Term]} & TT
// type ref = { $: "ref", slot: number, srcs: []} & TT
// type def = { $: "def", body: Term, name: string , ty: Term }
// type sym = { $: "symbol", srcs: [], slot: number} & TT


// type Term = CHC | TUP | chc | arw | tup | app | ref | def | Type | ctu | cch | sym

// const Type : Type = { $: "type", srcs: [] } as Type
// Type.ty = Type


// const CHC = (...srcs: Term[]): CHC => ({ $: "CHOICE", srcs, ty: Type });
// const TUP = (...srcs: Term[]): TUP => ({ $: "TUPLE", srcs, ty: Type });

// function sizeof(t:Term):number{
//   if (t.ty != Type) raise(`Expected type to be Type, got ${t.ty.$}`);
//   if (t.$ === "TUPLE") return t.srcs.length
//   return 1
// }

// const arw = ( ...srcs: [Term, Term, ...Term[]]): arw =>{
//   let A = srcs.slice(0, -1)
//   let S = A[0]
//   if (A.length > 1 || (A[0].$ != "TUPLE" && A[0].$ != "CHOICE")) S = TUP(...A)
//   return {$:"arrow", srcs: [S,srcs[A.length]], ty: Type}
// }

// const tup = (srcs: Term[], ty: Term): tup => ({ $: "tuple", srcs, ty });
// const chc = (tag: number, src: Term, ty: Term): chc => ({ $: "choice", tag, srcs: [src], ty });

// const ctu = (tag: number, src: Term, ty: Term): ctu => ({ $: "cotuple", tag, srcs: [src], ty });
// const cch = (srcs: Term[], ty: Term): cch => ({ $: "cochoice", srcs, ty });

// const app = (srcs: [ Term , Term], ty: Term): app => ({ $: "app", srcs, ty});
// const ref = (slot: number, ty: Term): ref => ({ $: "ref", slot, srcs: [], ty });
// const def = (name: string, t: Term): def => ({ $: "def", body:t, name, ty: t.ty });


// let seen = new Set<Term>();

// function fmt(t:Term, d:number =0): string{


//   let res = ''

//   function pln(t:Term, d: number= 0): string{
//     switch(t.$){
//       case "type":  return "Type";
//       case "arrow": return `(${go(t.srcs[0])} -> ${go(t.srcs[1])})`;
//       case "TUPLE": return `{${t.srcs.map(s => go(s)).join(" ∧ ")}}`;
//       case "CHOICE": return `(${t.srcs.map(s => go(s)).join(" ∨ ")})`;

//       case "tuple": case "cochoice": return `{${t.srcs.map(s => go(s)).join(", ")}} : ${go(t.ty)}`;
//       case "choice": case "cotuple": return `#${t.tag}(${go(t.srcs[0])}) : ${go(t.ty)}`;

//       case "app": return `(${go(t.srcs[0])} ${go(t.srcs[1])})`;
//       case "ref": return `x${t.slot}`
//       case "symbol": return `s${t.slot}`;
//       case "def": return `def ${go(t.body)}`;
//     }
//   }

//   function go(t: Term, d: number = 0): string {

//     if ("name" in t && t.name) {
//       if (!seen.has(t)) {
//         seen.add(t);
//         let k = pln(t, d);
//         let ts = go(t.ty, d);
//         res += t.name + " : " + ts + " = " +k + "\n";
//       }
//       return t.name;
//     }
//     return pln(t)
//   }

//   let k = go(t)
//   res +=  k
//   return res;
  


// }

// let NULL = def ("NULL", TUP())
// let Null = def ("Null", tup([], NULL))

// console.log(fmt(Null))
// let BOOL = def("BOOL", CHC(TUP(), TUP()))

// let TRU = def("TRU", chc(0, tup([], NULL), BOOL))
// let FAL = def("FAL", chc(1, tup([], NULL), BOOL))



// function raise(msg: string):never{
//   throw new Error(msg);
// }


// function substitute(t:Term, val: Term): Term{
//   if (t == Type) return t
//   switch(t.$){
//     case "ref":
//       if (t.slot == 0) {
//         SEq(t.ty, val.ty)
//         return val
//       };
//       return {...t, slot: t.slot - 1};

//     case "def": return t

//     default: return {...t, srcs: t.srcs.map(s => substitute(s, val)), ty: substitute(t.ty, val)} as Term;
//   }
// }


// function runCochoice(fn: cch, arg: chc): Term{
//   let bod = fn.srcs[arg.tag]
//   return substitute(bod, arg.srcs[0])
// }

// function runCotuple(fn: ctu, arg: tup): Term{
//   if (fn.tag !== arg.srcs.length) raise(`Expected ${fn.tag} arguments, got ${arg.srcs.length}`);
//   let bod = fn.srcs[0]
//   for (let i = 0; i < arg.srcs.length; i++){
//     bod = substitute(bod, arg.srcs[i])
//   }
//   return bod;
// }


// function runApp(app: app): Term{
//   let [fn, arg] = app.srcs;

//   if (fn.$ == "cochoice" && arg.$ == "choice") return runCochoice(fn, arg);
//   if (fn.$ == "cotuple" && arg.$ == "tuple") return runCotuple(fn, arg);
//   raise(`Cannot apply function of type ${fn.$} to argument of type ${arg.$}`);
// }


// function whnf(t: Term): Term{
//   if (t.$ == "app") return runApp(t);
//   return t;
// }


// function SEq(a: Term, b: Term){

//   while(a.$ == "def") a = a.body;
//   while(b.$ == "def") b = b.body;

//   if (a == b) return
//   if (a.$ != b.$) raise(`Expected terms of the same type, got ${a.$} and ${b.$}`);
  
// }


// let scounter = 0
// function fresh( ty: Term): sym {
//   return { $: "symbol", slot: scounter++, srcs:[], ty };
// }

// function checkTerm(t: Term) {


//   let ty = t.ty;

//   while (ty.$ == "def") ty = ty.body;
  

//   switch(t.$){
//     case "ref": {
//       raise(`Cannot check term of type ref directly`);
//     }
//     case "app":{
//       let [fn, arg] = t.srcs;
//       let F = fn.ty;
//       let A = arg.ty;
//       break;
//     }

//     case "tuple":{

//       if (ty.$ != "TUPLE") raise(`Expected intersect type for tuple, got ${ty.$}`);
//       let As = ty.srcs;
//       if (As.length != t.srcs.length) raise(`wrong number`)

//       for (let i = 0; i < ty.srcs.length; i++){
//         SEq(t.srcs[i].ty, As[0])

//         As = As.slice(1).map(A=>  substitute(A, t.srcs[i]))
//         checkTerm(t.srcs[i])
//       }
//       break
//     }

//     case "choice":{
//       if (ty.$ != "CHOICE") raise(`Expected union type for choice, got ${ty.$}`);
//       break
//     }

//     case "cotuple":{
//       if (ty.$ != "arrow") raise(`Expected arrow type for cotuple, got ${ty.$}`);
//       let [A,B] = ty.srcs;
//       if (A.$ != "TUPLE") raise(`Expected tuple type for cotuple argument, got ${A.$}`);

//       let As = A.srcs;
//       let args: Term [] =[];
//       let bod = t.srcs[0];
      
//       for (let i = 0; i < A.srcs.length; i++){
//         let arg = fresh(As[0]);


//         As = As.slice(1).map(x=>substitute(x,arg))
//         bod = substitute(bod, arg)
//         args.push(arg);
//       }

//       SEq(bod.ty, B)
//       checkTerm(bod)

//       break;

//     }

//     case "def":{

//       SEq(t.ty, t.body.ty)
//       checkTerm(t.body)
//       return;
//     }


//   }
// }


// function print(c: concise){
//   console.log(fmt(an(c)))
// }

// function check(c:concise, ty?: Term ){
//   let t= an(c)
//   if (ty) t.ty = ty
//   checkTerm(t)

// }
// function E____(c:concise, ty?:Term){
//   try{
//     check(an(c), ty)
//   }catch{
//     return
//   }
//   raise (`expected to fail: ${fmt(an(c))}`)
// }

// type concise = Term | concise[] | {coc: ((c:Term)=> concise)[]} | {cot:[concise,  (...c: Term[]) => concise]} | {a: [concise, concise]}

// function an(c: concise, ty?: concise, d: number = 0): Term{

//   if ("$" in c) return c
//   let T = ty ? an(ty, Type, d) : undefined;
//   if (Array.isArray(c)){
//     if (T?.$ == "TUPLE"){
//       return TUP(...c.map(x=>an(x, Type, d)))
//     }
//     if (!T) {
//       let fields = c.map(x=> an(x, undefined, d))
//       let As = fields.map(x=> x.ty)
//       let tt = tup(fields, TUP(...As))
//       return tt
//     }
//     raise(`Cannot handle array concise with type ${T ? T.$ : "undefined"}`)
//   }

//   if ("cot" in c) return cot(an(c.cot[0], {$:"TUPLE", srcs: [],  ty: Type} as TUP) , d, c.cot[1])
//   if ("a" in c){
//     let fn = an(c.a[0])
//     let x = an(c.a[1])
    
//   }
//   raise(`Cannot handle concise form ${JSON.stringify(c)} with type ${T ? T.$ : "undefined"}`);
// }


// function cot(A:Term, d:number, f: (...t:Term[])=> concise){
//   let len = f.length
//   if (A.$!="TUPLE") raise("not a tuple")
//   if (A.srcs.length != len) raise("wrong length")
//   let args = Array.from({length: len,}, (_,i)=> ref(i+ d, A.srcs[i]))
//   let bod = an(f(...args), undefined, d + len)
//   return ctu(len, bod, arw(A, bod.ty))
// }


// check(Null)
// check(BOOL)
// check(TRU)

// E____({...Null.body, ty: BOOL})
// E____({...TRU.body, ty: NULL})
// E____({...TRU, ty: NULL})

// check({...TRU.body, ty: BOOL})
// check({...TRU, ty: BOOL})

// check({cot:[[BOOL], (x)=>x]}, arw(BOOL,BOOL))
// E____({cot:[[NULL], (x)=>x]}, arw(BOOL,BOOL))
// E____({cot:[[BOOL], (x)=>x]}, arw(BOOL,NULL))
// E____({cot:[[BOOL], (x)=>x]}, arw(NULL,BOOL))
// E____({cot:[[BOOL], (x)=>x]}, arw(NULL,NULL))

// check({cot:[[BOOL, NULL], (b,n)=>b]}, arw(BOOL, NULL, BOOL))
// E____({cot:[[BOOL, NULL], (b,n)=>b]}, arw(BOOL, NULL, NULL))

// E____({cot:[[NULL, NULL], (b,n)=>b]}, arw(BOOL, NULL, BOOL))
// E____({cot:[[BOOL, NULL], (b,n)=>n]}, arw(BOOL, NULL, BOOL))

// const WBO = def("WBO", TUP(BOOL))
// check(WBO)

// check({ ... tup([TRU], WBO)})
// E____({ ... tup([Null], WBO)})
// E____({ ... tup([Null], TUP(BOOL))})
// check([TRU], WBO)
// E____([Null], WBO)
// E____([Null], TUP(BOOL))
// check(an([TRU, [TRU, TRU]]))
// check(ctu(1, ref(0, BOOL), arw(BOOL, BOOL)))
// check(cot(TUP(BOOL, NULL), 0, (b,n) => n))
// check({cot:[[BOOL, BOOL], (b,n)=>n]})

// const SIG1 = def("SIG1", TUP(Type, ref(0, Type)))

// check([BOOL, TRU], SIG1)
// check([BOOL, NULL, TRU], TUP(Type, Type, ref(0, Type)))
// check([BOOL, NULL, Null], TUP(Type, Type, ref(1, Type)))
// E____([BOOL, NULL, Null], TUP(Type, Type, ref(0, Type)))
// E____([BOOL, NULL, TRU], TUP(Type, Type, ref(1, Type)))

// const SFAM = an({cot:[[Type], (T)=> T]})






