pub mod actor;
pub mod decode;
pub mod execute;
pub mod runtime_error;

use serde::{Deserialize, Serialize};
use crate::mem::{Memory, StackManager};
use crate::{CALL_STACK_END, CALL_STACK_START, Op, ParseError, Parser, Register::FP, Registers};

pub use self::actor::Actor;
pub use self::decode::Decode;
pub use crate::canvas::event::Event;
pub use self::execute::Execute;
pub use crate::canvas::message::{Action, Message};
pub use self::runtime_error::RuntimeError;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Machine {
    /// Addressable identifier of the machine.
    pub id: Option<u16>,

    /// Memory buffer of the machine.
    pub mem: Memory,

    /// Registers of the machine.
    pub reg: Registers,

    /// Events generated by the machine.
    pub events: Vec<Event>,

    /// Inbox contains messages sent to this machine.
    pub inbox: Vec<Message>,

    /// Outbox contains messages sent from this machine.
    pub outbox: Vec<Message>,

    /// Is the machine in debug mode?
    pub is_debug: bool,

    /// How many messages does the machine expect to receive?
    pub expected_receives: u16,
}

impl Machine {
    /// Creates a new machine.
    pub fn new() -> Machine {
        Machine {
            id: None,

            mem: Memory::new(),
            reg: Registers::new(),

            events: vec![],

            inbox: vec![],
            outbox: vec![],

            is_debug: false,
            expected_receives: 0,
        }
    }

    /// Returns a stack manager for the current machine.
    pub fn stack(&mut self) -> StackManager {
        let mut stack = StackManager::new(&mut self.mem, &mut self.reg);
        stack.is_debug = self.is_debug;
        stack
    }

    pub fn call_stack(&mut self) -> StackManager {
        let mut stack = self.stack();
        stack.sp = FP;
        stack.min = CALL_STACK_START;
        stack.max = CALL_STACK_END;
        stack
    }

    /// Reset the machine completely.
    pub fn full_reset(&mut self) {
        self.partial_reset();
        self.mem.reset();
        self.inbox.clear();
        self.outbox.clear();
        self.events.clear();
    }

    /// Reset the execution state and execution memory of the machine only.
    pub fn partial_reset(&mut self) {
        self.reg.reset();
        self.mem.reset_stacks();
        self.expected_receives = 0;
    }
}

impl From<Vec<Op>> for Machine {
    fn from(code: Vec<Op>) -> Self {
        let mut m = Machine::new();
        m.mem.load_code(code);
        m
    }
}

impl TryFrom<&str> for Machine {
    type Error = ParseError;

    fn try_from(source: &str) -> Result<Self, Self::Error> {
        let parser: Parser = source.try_into()?;

        let mut machine: Self = parser.ops.into();
        machine.mem.load_symbols(parser.symbols);
        Ok(machine)
    }
}
