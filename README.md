# minimal Dependent Type checker in ts

based on the bend2 language a minimal proof checker in ts.

The goal is to create a TINY implementation of a sound dependent type checker so you can audit it yourself!

at the moment the most interesting thing is [hoas.5.affinity.ts](hoas.5.affinity.ts) a minimal implementation of BendTT

supporting proof checking with
 - hoas abstractions for functions arrows and ADTs
 - elaboration of related types in match
 - equality as a rfl AXIOM not a build in AST types!
 - 3 universes of types (-1: Erased, 0: Type, 1: Data)
 - structural recursion checking

not supported yet:
 - comptime arguments
 - mutual recursion
 - macros
