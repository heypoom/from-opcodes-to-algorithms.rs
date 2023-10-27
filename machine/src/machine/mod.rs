mod decode;
mod execute;
mod event;
mod message;

use crate::{Op, Registers, Register::FP, Parser, CALL_STACK_END, CALL_STACK_START};
use crate::Event::Send;
use crate::mem::{Memory, StackManager};

pub use self::decode::Decode;
pub use self::execute::Execute;
pub use self::event::{Event};
pub use self::message::{Message, Action};

#[derive(Debug)]
pub struct Machine {
    /// Addressable identifier of the machine.
    pub id: Option<u16>,

    /// Is the machine in debug mode?
    pub is_debug: bool,

    /// Memory buffer of the machine.
    pub mem: Memory,

    /// Registers of the machine.
    pub reg: Registers,

    /// Events generated by the machine.
    pub events: Vec<Event>,

    /// Mailbox contains messages sent to this machine.
    pub mailbox: Vec<Message>,
}

impl Machine {
    /// Creates a new machine.
    pub fn new() -> Machine {
        Machine {
            id: None,
            is_debug: false,
            mem: Memory::new(),
            reg: Registers::new(),
            events: vec![],
            mailbox: vec![],
        }
    }

    /// Returns a stack orchestrator for the current machine.
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

    /// Push a message to a recipient's mailbox.
    pub fn send_message(&mut self, to: u16, action: Action) {
        // If the machine has no address, it cannot send messages.
        let Some(id) = self.id else { return; };

        // Add the message to the mailbox.
        let message = Message { from: id, to, action };
        self.events.push(Send { message: message.clone() });
    }
}

impl From<Vec<Op>> for Machine {
    fn from(code: Vec<Op>) -> Self {
        let mut m = Machine::new();
        m.mem.load_code(code);
        m
    }
}

impl From<&str> for Machine {
    fn from(source: &str) -> Self {
        let p: Parser = source.into();
        let mut m: Self = p.ops.into();
        m.mem.load_symbols(p.symbols);
        m
    }
}

