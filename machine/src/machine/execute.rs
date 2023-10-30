use crate::{Event, RuntimeError};
use crate::machine::{Decode, Machine};
use crate::register::Register::PC;
use crate::op::Op;
use crate::mem::WithStringManager;
use crate::machine::{Action, Actor};

type Errorable = Result<(), RuntimeError>;

pub trait Execute {
    /// Execute an instruction.
    fn exec_op(&mut self, op: Op) -> Errorable;

    /// Executes the current instruction.
    fn tick(&mut self) -> Errorable;

    /// Runs the machine until it halts.
    fn run(&mut self) -> Errorable;

    /// Returns whether the machine should halt.
    fn should_halt(&self) -> bool;
}

impl Execute for Machine {
    /// Execute an instruction.
    fn exec_op(&mut self, op: Op) -> Errorable {
        // Should we jump to a different instruction?
        let mut jump: Option<u16> = None;

        // Initialize the stack helper.
        let mut s = self.stack();

        match op {
            Op::Noop | Op::Halt | Op::Eof => {}

            Op::Push(v) => { s.push(v).expect("push error"); }
            Op::Pop => { s.pop().expect("pop error"); }

            Op::Load(addr) => {
                let v = self.mem.get(addr);
                self.stack().push(v).expect("load error");
            }

            Op::Store(addr) => {
                let v = s.pop().expect("store read error");
                self.mem.set(addr, v);
            }

            // Addition, subtraction, multiplication and division.
            Op::Add => s.apply_two(|a, b| a + b)?,
            Op::Sub => s.apply_two(|a, b| b - a)?,
            Op::Mul => s.apply_two(|a, b| a * b)?,
            Op::Div => s.apply_two(|a, b| b / a)?,

            // Increment and decrement.
            Op::Inc => s.apply(|v| v + 1)?,
            Op::Dec => s.apply(|v| v - 1)?,

            // Equality and comparison operations.
            Op::Equal => s.apply_two(|a, b| (a == b).into())?,
            Op::NotEqual => s.apply_two(|a, b| (a != b).into())?,
            Op::LessThan => s.apply_two(|a, b| (a < b).into())?,
            Op::LessThanOrEqual => s.apply_two(|a, b| (a <= b).into())?,
            Op::GreaterThan => s.apply_two(|a, b| (a > b).into())?,
            Op::GreaterThanOrEqual => s.apply_two(|a, b| (a >= b).into())?,

            // TODO: write a unit test for jump, and op that uses jump.
            //       there was a bug caused by using set(PC) instead of assigning to jump
            Op::Jump(addr) => {
                jump = Some(addr);
            }

            Op::JumpZero(addr) => {
                if let Ok(0) = s.pop() {
                    jump = Some(addr);
                }
            }

            Op::JumpNotZero(addr) => {
                if let Ok(v) = s.pop() {
                    if v != 0 {
                        jump = Some(addr);
                    }
                };
            }

            Op::Dup => {
                let v = s.peek();
                s.push(v)?;
            }

            Op::Swap => {
                let a = s.pop()?;
                let b = s.pop()?;

                s.push(a)?;
                s.push(b)?;
            }

            Op::Over => {
                let v = s.get(1);
                s.push(v)?;
            }

            Op::Print => {
                let mut bytes = vec![];

                while let Ok(v) = s.pop() {
                    if v == 0 { break; }
                    bytes.push(v);
                }

                // The op are popped in reverse-order.
                bytes.reverse();

                let text = self.mem.string().get_str_from_bytes(bytes).expect("invalid string");

                // Add the event to the event queue.
                self.events.push(Event::Print { text });
            }

            Op::LoadString(addr) => {
                let text = self.mem.string().get_str_bytes(addr);

                for v in text.iter() {
                    self.stack().push(*v).expect("push error");
                }
            }

            Op::Call(address) => {
                let pc = self.reg.get(PC);

                self.call_stack().push(pc).expect("call stack exceeded");
                jump = Some(address);
            }

            Op::Return => {
                let address = self.call_stack().pop().expect("cannot pop the return address");

                // Return to to the return address, plus one.
                jump = Some(address + 1);
            }

            Op::Send(to, size) => {
                let mut body = vec![];

                for _ in 0..size {
                    body.push(s.pop().expect("message body does not exist in stack"));
                }

                self.send_message(to, Action::Data { body });
            }

            Op::Receive => {
                self.expected_receives += 1;
            }

            // TODO: implement the memory map operation.
            Op::MemoryMap(..) => {}
        };

        // Advance or jump the program counter.
        if let Some(addr) = jump {
            self.reg.set(PC, addr);
        } else {
            self.reg.inc(PC);
        }

        Ok(())
    }

    // Fetch, decode and execute the instruction.
    fn tick(&mut self) -> Errorable {
        let op = self.decode();

        self.exec_op(op)
    }

    fn run(&mut self) -> Errorable {
        self.reg.set(PC, 0);

        while !self.should_halt() {
            self.tick()?;
        }

        Ok(())
    }

    fn should_halt(&self) -> bool {
        let op: Op = self.opcode().into();

        op == Op::Halt || op == Op::Eof
    }
}