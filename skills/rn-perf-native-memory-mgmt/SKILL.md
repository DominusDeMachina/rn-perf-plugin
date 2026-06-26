---
name: rn-perf-native-memory-mgmt
description: Use when the user is writing or reviewing native code in a React Native app and needs to reason about ARC, garbage collection, smart pointers, reference cycles, or weak references — the theory chapter that supports leak-free Kotlin/Swift/Objective-C/C++ in native modules, Turbo Modules, Fabric components, and Nitro modules. Trigger whenever the user mentions ARC, deinit, retain cycle, reference cycle, weak self, weak var, WeakReference, WeakHashMap, AutoCloseable, smart pointer, unique_ptr, shared_ptr, weak_ptr, make_unique, make_shared, std::move, Unmanaged.passRetained, Unmanaged.passUnretained, takeRetainedValue, takeUnretainedValue, JNI global ref, or asks "should I use weak or strong here?".
---

# Native Memory Management (ARC, GC, Smart Pointers)

## When to use
The user is writing or reviewing native code (Swift, Objective-C, Kotlin, Java, C++) — typically in a native module, Turbo Module, Fabric component, or Nitro module — and needs to reason about ownership, lifecycle, and cycles to avoid creating a leak detectable by [[rn-perf-hunt-native-memory-leaks]].

## What this skill does (single responsibility)
Builds the mental model for writing leak-free native code: reference counting vs garbage collection vs manual; smart pointer selection; reference cycles; weak references; the `Unmanaged` Swift↔C interop rules. Out of scope: how to *find* an existing leak (see [[rn-perf-hunt-native-memory-leaks]]), CPU profiling (see [[rn-perf-profile-native]]), and JS heap (see [[rn-perf-hunt-js-memory-leaks]]).

## The three memory-management models

| Model | Languages | Cleanup timing | Cycles? | Notes |
|---|---|---|---|---|
| **Reference counting (ARC)** | Swift, Objective-C (also Python, PHP) | Deterministic — at the line the last ref leaves scope | **Vulnerable** — break with `weak` | No GC pauses |
| **Garbage collection (GC)** | Kotlin/Java, C#, JavaScript (Hermes/Hades) | Non-deterministic — runs periodically on its own thread | Robust to cycles | Can cause pauses (non-concurrent GCs) |
| **Manual** | C, C++ | You `new` / `delete`, `malloc` / `free` | Vulnerable | Modern C++ mitigates via smart pointers (RAII) |

## C++ smart pointer cheat sheet

| Type | Ownership | Copyable | Use when |
|---|---|---|---|
| `std::unique_ptr<T>` | Sole | Move-only | Exclusive ownership / immutable structures |
| `std::shared_ptr<T>` | Shared (refcount) | Yes | Multiple owners share an object |
| `std::weak_ptr<T>` | None (observer) | Yes | Break cycles around a `shared_ptr`; call `.lock()` to access |

Prefer `make_unique<T>(...)` / `make_shared<T>(...)` over raw `new`. Prefer **stack allocation** by default — the book emphasises: *"You should always think twice before putting something on the heap, as it has a significantly bigger overhead than the stack."*

## Kotlin/Java weak containers
- `WeakReference<T>` — wraps a value with a weak ref. Useful as `mutableListOf<WeakReference<Listener>>()` to break listener-singleton leaks.
- `WeakHashMap<K, V>` — weak refs **only on keys** (not values). When nothing else references a key, the entry vanishes on the next GC.
- Kotlin has **no deterministic destructor** — implement `AutoCloseable` with a `close()` contract for explicit cleanup lifecycle.

## Swift `Unmanaged` (manual override for C/C++ interop)
Swift normally manages ARC for you. `Unmanaged<T>` lets you cross over to C/C++ by manually controlling the count.

| Call | Effect on refcount |
|---|---|
| `Unmanaged.passRetained(obj)` | **+1** |
| `Unmanaged.passUnretained(obj)` | no change |
| `.takeRetainedValue()` | **-1** |
| `.takeUnretainedValue()` | no change |
| `.toOpaque()` | raw pointer for C interop |

**Rule: match `passRetained` with `takeRetainedValue`, and `passUnretained` with `takeUnretainedValue`. Decrementing below 0 (`passUnretained` → `takeRetainedValue`) crashes; the reverse mismatch over-retains and leaks.**

## Workflow

1. **Identify which language owns the memory.** Swift/Obj-C → ARC; Kotlin/Java → GC; C++ in Turbo Modules / Fabric / Nitro → manual + smart pointers.
2. **ARC code:** find every strong cyclic reference — delegate patterns, parent↔child, closures capturing `self` — break with `weak`.
3. **GC code:** find every listener / callback / static singleton holding instances — convert to `WeakReference`, or unregister in `onDestroy` / `close()` / `invalidate()`.
4. **C++ code:** prefer stack allocation; when heap is needed, `std::unique_ptr` (exclusive) or `std::shared_ptr` (shared); break cycles with `std::weak_ptr`. Use `make_unique` / `make_shared` factories.
5. **`Unmanaged` Swift ↔ C:** audit pair-matching of `passRetained` ↔ `takeRetainedValue` and `passUnretained` ↔ `takeUnretainedValue` on every call.

## Code patterns

`std::unique_ptr` — ownership transfer via `std::move`:
```cpp
void takeOwnership(std::unique_ptr<std::string> s1) {
    std::cout << *s1;
}  // automatically deleted

int main() {
    auto str1 = std::make_unique<std::string>("Hello World");
    takeOwnership(std::move(str1));
    // str1 is empty here
}
```

`std::shared_ptr` + `std::weak_ptr` to break a cycle:
```cpp
class A { std::shared_ptr<B> b; };
class B { std::weak_ptr<A> a; };  // weak — no cycle

void useWeakPtr(std::weak_ptr<std::string> weak) {
    if (auto shared = weak.lock()) {
        std::cout << *shared;            // safe
    } else {
        std::cout << "Object no longer exists!\n";
    }
}
```

Swift — break a delegate cycle:
```swift
class A { var b: B? }
class B { weak var a: A? }
```

Kotlin — `WeakReference` listener container:
```kotlin
class DataManager {
    private val listeners = mutableListOf<WeakReference<DataListener>>()
}
```

Kotlin — `AutoCloseable` cleanup lifecycle:
```kotlin
class MyClass : AutoCloseable {
    override fun close() {
        dataManager.unregisterListener(listener)
    }
}
```

Swift `Unmanaged` — matched retain/release:
```swift
class MyObject { deinit { print("Deallocated") } }

let obj = MyObject()                          // refcount = 1
let unmanaged = Unmanaged.passRetained(obj)   // refcount = 2
let object1 = unmanaged.takeRetainedValue()   // refcount = 1  (matched)
```

Mismatched — crash:
```swift
let unmanaged = Unmanaged.passUnretained(obj)  // refcount unchanged
let object1 = unmanaged.takeRetainedValue()    // CRASH — decrements below 0
```

## Verification
Verification is operational, not theoretical — apply a pattern from this skill, then profile via [[rn-perf-hunt-native-memory-leaks]] to confirm:
- C++ `delete` / smart-pointer change → Instruments Leaks shows green.
- Swift `weak` → Allocations stops growing on view re-creation.
- Kotlin `WeakReference` / `AutoCloseable` → Allocations == Deallocations across configuration changes.

## Edge cases & gotchas
- **Cycles can span more than two classes.** A → B → C → A is just as broken. The book: *"the cycles can span multiple classes, which makes them harder to find and fix."*
- **Refactor around cycles**: introducing a third "owner" class C that holds the shared resource (with A and B both referencing C) is sometimes cleaner than weak pointers everywhere.
- `weak_ptr.lock()` returns a `shared_ptr` that *does* temporarily bump the refcount while in scope. Don't store the locked pointer past where you need it.
- `std::unique_ptr` is **move-only**. Passing by value transfers ownership; pass by `const&` to borrow without transferring.
- In Swift closures, use `[weak self]` to avoid the classic closure-retains-self cycle.
- **GC pauses can look like perf bugs.** Periodic UI hitches under Hades (Hermes' GC) are GC pressure, not a leak per se.
- **`Unmanaged` rules summary**: retained ↔ retained, unretained ↔ unretained. Under-retaining (refcount below 0) *crashes*; over-retaining leaks.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2026), chapter "Understanding Native Memory Management", pp. 111–125.

## Related skills
- [[rn-perf-hunt-native-memory-leaks]] — the operational sibling: how to *find* an existing leak.
- [[rn-perf-hunt-js-memory-leaks]] — GC sibling for the JS heap (Hermes/Hades).
- [[rn-perf-platform-differences]] — prerequisite mental map.
- [[rn-perf-native-modules-faster]] — writing native modules involves all three memory models.
- [[rn-perf-threading-model]] — JNI interop has its own JNI ref / global-ref leak patterns.
